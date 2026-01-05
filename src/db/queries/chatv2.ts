"server-only";

import { type UIMessage, validateUIMessages } from "ai";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { type Chat, chat as chatTable } from "../schemas/chatv2";
import { type DBMessage, message as messageTable } from "../schemas/messagev2";

export async function getChatById({
  publicId,
}: {
  publicId: string;
}): Promise<Chat | null> {
  const [selectedChat] = await db
    .select()
    .from(chatTable)
    .where(eq(chatTable.publicId, publicId));
  return selectedChat ?? null;
}

export async function createChat({
  publicId,
  userId,
  title,
  visibility,
}: {
  publicId: string;
  userId: number;
  title: string;
  visibility: "public" | "private";
}): Promise<Chat> {
  const [insertedChat] = await db
    .insert(chatTable)
    .values({
      publicId,
      userId,
      title,
      visibility,
      createdAt: new Date(),
    })
    .returning();
  return insertedChat;
}

export async function getMessagesByChatId({
  chatId,
}: {
  chatId: number;
}): Promise<DBMessage[]> {
  return await db
    .select()
    .from(messageTable)
    .where(eq(messageTable.chatId, chatId))
    .orderBy(asc(messageTable.createdAt));
}

export async function saveMessages({
  messages,
}: {
  messages: Omit<DBMessage, "id">[];
}): Promise<void> {
  await db
    .insert(messageTable)
    .values(messages)
    .onConflictDoNothing({
      target: [messageTable.publicId],
    });
}

export async function updateChatTitle({
  chatId,
  title,
}: {
  chatId: number;
  title: string;
}): Promise<void> {
  await db.update(chatTable).set({ title }).where(eq(chatTable.id, chatId));
}

export async function loadChatMessages({
  chatPublicId,
}: {
  chatPublicId: string;
}): Promise<UIMessage[]> {
  const messages = await db
    .select({
      id: messageTable.publicId,
      role: messageTable.role,
      parts: messageTable.parts,
      createdAt: messageTable.createdAt,
    })
    .from(messageTable)
    .innerJoin(chatTable, eq(messageTable.chatId, chatTable.id))
    .where(eq(chatTable.publicId, chatPublicId))
    .orderBy(asc(messageTable.createdAt));
  const validatedMessages = validateUIMessages({ messages });
  return validatedMessages;
}
