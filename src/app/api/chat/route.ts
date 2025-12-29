import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  type LanguageModelUsage,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import { generateTitleFromUserMessage } from "@/app/(authed)/actions";
import {
  deleteChatById,
  getChatById,
  saveChat,
  updateChatTitleById,
} from "@/db/queries/chat";
import {
  getMessagesByChatId,
  saveMessages,
  updateMessage,
} from "@/db/queries/message";
import { createStreamId } from "@/db/queries/stream";
import type { DBMessage } from "@/db/schemas/message";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { getSession } from "@/lib/auth";
import { isProductionEnvironment } from "@/lib/constants";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  console.log("[CHAT API] POST request received");

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
    console.log("[CHAT API] Request parsed successfully:", {
      chatId: requestBody.id,
      hasMessage: !!requestBody.message,
      messageCount: requestBody.messages?.length,
      model: requestBody.selectedChatModel,
    });
  } catch (error) {
    console.error("[CHAT API] Failed to parse request:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const { id, message, messages, selectedChatModel, selectedVisibilityType } =
      requestBody;

    console.log("[CHAT API] Starting chat stream for chat:", id);

    const session = await getSession();

    if (!session?.userId) {
      console.error("[CHAT API] Unauthorized: No user session");
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    console.log("[CHAT API] User authenticated:", session.userId);

    // Check if this is a tool approval flow (all messages sent)
    const isToolApprovalFlow = Boolean(messages);
    console.log("[CHAT API] Tool approval flow:", isToolApprovalFlow);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (String(chat.userId) !== session.userId) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
      if (!isToolApprovalFlow) {
        // Only fetch messages if chat already exists and not tool approval
        messagesFromDb = await getMessagesByChatId({ id });
      }
    } else if (message?.role === "user") {
      // Save chat immediately with placeholder title
      await saveChat({
        id,
        userId: session.userId,
        title: "New chat",
        visibility: selectedVisibilityType,
      });

      // Start title generation in parallel (don't await)
      titlePromise = generateTitleFromUserMessage({ message });
    }

    // Use all messages for tool approval, otherwise DB messages + new message
    const uiMessages = isToolApprovalFlow
      ? (messages as ChatMessage[])
      : [...convertToUIMessages(messagesFromDb), message as ChatMessage];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    if (message?.role === "user") {
      // Only save user messages to the database (not tool approval responses)
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts,
            attachments: [],
            createdAt: new Date(),
            inputTokenDetails: null,
            outputTokenDetails: null,
            totalTokens: null,
          },
        ],
      });
    }

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });
    console.log("[CHAT API] Stream ID created:", streamId);

    // Store token usage data to access in the outer onFinish callback
    const tokenUsageData: LanguageModelUsage | undefined = undefined;

    function buildTokenUsageData(
      message: ChatMessage,
      tokenUsageData?: LanguageModelUsage
    ) {
      if (message.role !== "assistant") {
        return {
          inputTokenDetails: null,
          outputTokenDetails: null,
          totalTokens: null,
        };
      }
      return {
        inputTokenDetails: tokenUsageData?.inputTokenDetails ?? null,
        outputTokenDetails: tokenUsageData?.outputTokenDetails ?? null,
        totalTokens: tokenUsageData?.totalTokens ?? null,
      };
    }

    console.log("[CHAT API] Creating UI message stream");

    const stream = createUIMessageStream({
      // Pass original messages for tool approval continuation
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        console.log("[CHAT API] Stream execute callback started");
        // Handle title generation in parallel
        if (titlePromise) {
          titlePromise.then((title) => {
            updateChatTitleById({ chatId: id, title });
            dataStream.write({ type: "data-chat-title", data: title });
          });
        }

        const isReasoningModel =
          selectedChatModel.includes("reasoning") ||
          selectedChatModel.includes("thinking");

        console.log(
          "[CHAT API] Starting streamText with model:",
          selectedChatModel,
          {
            isReasoningModel,
            messageCount: uiMessages.length,
          }
        );

        const result = streamText({
          model: getLanguageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: await convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools: isReasoningModel
            ? []
            : [
                "getWeather",
                "createDocument",
                "updateDocument",
                "requestSuggestions",
              ],
          experimental_transform: isReasoningModel
            ? undefined
            : smoothStream({ chunking: "word" }),
          providerOptions: isReasoningModel
            ? {
                anthropic: {
                  thinking: { type: "enabled", budgetTokens: 10_000 },
                },
              }
            : undefined,
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          // onFinish: ({ usage }) => {
          //   // Capture token usage data
          //   tokenUsageData = usage;
          // },
        });

        console.log("[CHAT API] Consuming stream and merging to dataStream");
        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
        console.log("[CHAT API] Stream merged successfully");
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        console.log("[CHAT API] Stream onFinish callback:", {
          messageCount: finishedMessages.length,
          isToolApprovalFlow,
        });
        if (isToolApprovalFlow) {
          // For tool approval, update existing messages (tool state changed) and save new ones
          for (const finishedMsg of finishedMessages) {
            const existingMsg = uiMessages.find((m) => m.id === finishedMsg.id);
            if (existingMsg) {
              // Update existing message with new parts (tool state changed)
              await updateMessage({
                id: finishedMsg.id,
                parts: finishedMsg.parts,
              });
            } else {
              // Save new message
              await saveMessages({
                messages: [
                  {
                    id: finishedMsg.id,
                    role: finishedMsg.role,
                    parts: finishedMsg.parts,
                    createdAt: new Date(),
                    attachments: [],
                    chatId: id,
                    ...buildTokenUsageData(finishedMsg, tokenUsageData),
                  },
                ],
              });
            }
          }
        } else if (finishedMessages.length > 0) {
          // Normal flow - save all finished messages
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id,
              ...buildTokenUsageData(currentMessage, tokenUsageData),
            })),
          });
        }
      },
      onError: (error) => {
        console.error("[CHAT API] Stream error:", error);
        return "Oops, an error occurred!";
      },
    });

    console.log("[CHAT API] UI message stream created");

    const streamContext = getStreamContext();

    if (streamContext) {
      console.log("[CHAT API] Creating resumable stream");
      try {
        const sseStream = stream.pipeThrough(new JsonToSseTransformStream());
        console.log("[CHAT API] SSE transform applied");

        const resumableStream = await streamContext.resumableStream(
          streamId,
          () => sseStream
        );
        if (resumableStream) {
          console.log("[CHAT API] Returning resumable stream response");
          return new Response(resumableStream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        }
        console.log("[CHAT API] Resumable stream was null, falling back");
      } catch (error) {
        console.error("[CHAT API] Failed to create resumable stream:", error);
      }
    } else {
      console.log(
        "[CHAT API] No stream context available, using regular stream"
      );
    }

    console.log("[CHAT API] Returning regular SSE stream response");
    const sseStream = stream.pipeThrough(new JsonToSseTransformStream());
    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await getSession();

  if (!session?.userId) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (String(chat?.userId) !== session.userId) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
