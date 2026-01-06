import { cookies } from "next/headers";
import { Chat } from "@/components/chat/chatv2";
import { loadChatMessages } from "@/db/queries/chatv2";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const messages = await loadChatMessages({ chatPublicId: id });
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");
  const initialChatModel = modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  return (
    <Chat
      id={id}
      initialChatModel={initialChatModel}
      initialMessages={messages}
    />
  );
}
