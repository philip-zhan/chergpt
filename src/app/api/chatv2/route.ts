import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { generateTitleFromUserMessage } from "@/app/(authed)/actions";
import {
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from "@/db/queries/chatv2";
import { getUser } from "@/lib/auth";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { id: chatId, messages }: { id: string; messages: UIMessage[] } =
    await req.json();

  const user = await getUser();
  const userId = Number(user.id);

  // Check if chat exists
  let chat = await getChatById({ publicId: chatId });
  let dbChatId: number;

  if (chat) {
    dbChatId = chat.id;
  } else {
    // Create new chat
    const userMessage = messages.find((m) => m.role === "user");
    const title = userMessage
      ? await generateTitleFromUserMessage({ message: userMessage })
      : "New chat";

    chat = await saveChat({
      publicId: chatId,
      userId,
      title,
      visibility: "private",
    });
    dbChatId = chat.id;
  }

  const result = streamText({
    model: "openai/gpt-5.2-chat",
    system: "You are a helpful assistant.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
    originalMessages: messages,
    onFinish: async ({ messages: responseMessages }) => {
      // Get existing message IDs from DB to avoid duplicates
      const existingMessages = await getMessagesByChatId({ chatId: dbChatId });
      const existingIds = new Set(existingMessages.map((m) => m.publicId));

      // Filter out messages that already exist
      const newMessages = responseMessages.filter(
        (m) => !existingIds.has(m.id)
      );

      if (newMessages.length > 0) {
        await saveMessages({
          messages: newMessages.map((msg) => ({
            publicId: msg.id,
            chatId: dbChatId,
            role: msg.role,
            parts: msg.parts,
            attachments: [],
            createdAt: new Date(),
            inputTokenDetails: null,
            outputTokenDetails: null,
            totalTokens: null,
          })),
        });
      }
    },
  });
}
