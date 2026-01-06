import {
  convertToModelMessages,
  type LanguageModelUsage,
  streamText,
  type UIMessage,
  validateUIMessages,
} from "ai";
import {
  createChat,
  getChatById,
  loadChatMessages,
  saveMessages,
  updateChatVisibilityById,
} from "@/db/queries/chatv2";
import { getLanguageModel } from "@/lib/ai/providers";
import { getSession, getUserId } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";
import { nanoid } from "@/lib/nanoid";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    id: chatId,
    message,
    selectedChatModel,
  }: {
    id: string;
    message: UIMessage;
    selectedChatModel: string;
  } = await req.json();

  const userId = await getUserId();

  // get or create chat
  let chat = await getChatById({ publicId: chatId });
  if (!chat) {
    chat = await createChat({
      publicId: chatId,
      userId,
      title: "New chat",
      visibility: "private",
    });
  }

  const previousMessages = await loadChatMessages({
    chatPublicId: chat.publicId,
  });
  const messages = [...previousMessages, message];

  const validatedMessages = await validateUIMessages({ messages });

  let tokenUsageData: LanguageModelUsage;

  const result = streamText({
    model: getLanguageModel(selectedChatModel),
    system: "You are a helpful assistant.",
    messages: await convertToModelMessages(validatedMessages),
    onFinish: ({ usage }) => {
      tokenUsageData = usage;
    },
  });

  result.consumeStream();

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
    originalMessages: validatedMessages,
    generateMessageId: () => nanoid(),
    onFinish: async ({ messages }) => {
      const dbMessages = messages.map((message) => ({
        publicId: message.id,
        chatId: chat.id,
        role: message.role,
        parts: message.parts,
        attachments: [],
        createdAt: new Date(),
        model_name: selectedChatModel,
        inputTokenDetails:
          message.role === "assistant"
            ? (tokenUsageData?.inputTokenDetails ?? null)
            : null,
        outputTokenDetails:
          message.role === "assistant"
            ? (tokenUsageData?.outputTokenDetails ?? null)
            : null,
        totalTokens:
          message.role === "assistant"
            ? (tokenUsageData?.totalTokens ?? null)
            : null,
      }));
      await saveMessages({ messages: dbMessages });
    },
  });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await getSession();

  if (!session?.userId) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ publicId: id });

  if (String(chat?.userId) !== session.userId) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const { visibility } = await request.json();

  await updateChatVisibilityById({ chatId: id, visibility });

  return Response.json({ success: true }, { status: 200 });
}
