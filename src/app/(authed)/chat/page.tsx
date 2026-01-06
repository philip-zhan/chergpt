import { cookies } from "next/headers";
import { Chat } from "@/components/chat/chatv2";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { nanoid } from "@/lib/nanoid";

export default async function Page() {
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");
  const initialChatModel = modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  return (
    <Chat
      id={nanoid()}
      initialChatModel={initialChatModel}
      initialMessages={[]}
    />
  );
}
