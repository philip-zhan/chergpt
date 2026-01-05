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
} from "@/db/queries/chatv2";
import { getUserId } from "@/lib/auth";
import { nanoid } from "@/lib/nanoid";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { id: chatId, message }: { id: string; message: UIMessage } =
    await req.json();

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
    model: "openai/gpt-5.2-chat",
    system: "You are a helpful assistant.",
    messages: await convertToModelMessages(validatedMessages),
    onFinish: ({ usage }) => {
      tokenUsageData = usage;
    },
  });

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
