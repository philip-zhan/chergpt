import { Chat } from "@/components/chat/chatv2";
import { nanoid } from "@/lib/nanoid";

export default function Page() {
  return <Chat id={nanoid()} initialMessages={[]} />;
}
