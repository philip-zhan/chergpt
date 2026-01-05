import { redirect } from "next/navigation";
import { Chat } from "@/components/chat/chatv2";
import { loadChatMessages } from "@/db/queries/chatv2";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const messages = await loadChatMessages({ chatPublicId: id });

  if (messages.length === 0) {
    redirect("/new");
  }

  return <Chat id={id} initialMessages={messages} />;
}
