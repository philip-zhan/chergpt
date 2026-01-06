"use server";

import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import { updateChatVisibilityById } from "@/db/queries/chatv2";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
} from "@/db/queries/message";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisibilityById({ chatId, visibility });
}
