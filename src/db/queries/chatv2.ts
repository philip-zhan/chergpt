"server-only";

import { type UIMessage, validateUIMessages } from "ai";
import { and, asc, desc, eq, gt, inArray, lt, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ChatSDKError } from "@/lib/errors";
import { type Chat, chat } from "../schemas/chatv2";
import { type DBMessage, message } from "../schemas/messagev2";

export async function getChatById({
  publicId,
}: {
  publicId: string;
}): Promise<Chat | null> {
  const [selectedChat] = await db
    .select()
    .from(chat)
    .where(eq(chat.publicId, publicId));
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
    .insert(chat)
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

export async function saveMessages({
  messages,
}: {
  messages: Omit<DBMessage, "id">[];
}): Promise<void> {
  await db
    .insert(message)
    .values(messages)
    .onConflictDoNothing({
      target: [message.publicId],
    });
}

export async function updateChatTitle({
  chatId,
  title,
}: {
  chatId: number;
  title: string;
}): Promise<void> {
  await db.update(chat).set({ title }).where(eq(chat.id, chatId));
}

export async function loadChatMessages({
  chatPublicId,
}: {
  chatPublicId: string;
}): Promise<UIMessage[]> {
  const messages = await db
    .select({
      id: message.publicId,
      role: message.role,
      parts: message.parts,
      createdAt: message.createdAt,
    })
    .from(message)
    .innerJoin(chat, eq(message.chatId, chat.id))
    .where(eq(chat.publicId, chatPublicId))
    .orderBy(asc(message.createdAt));
  if (messages.length === 0) {
    return [];
  }
  return validateUIMessages({ messages });
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db
      .update(chat)
      .set({ visibility })
      .where(eq(chat.publicId, chatId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: number }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(message).where(inArray(message.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  userId,
  limit,
  startingAfter,
  endingBefore,
}: {
  userId: number;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select({
          id: chat.publicId,
          createdAt: chat.createdAt,
          title: chat.title,
          userId: chat.userId,
          visibility: chat.visibility,
        })
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, userId))
            : eq(chat.userId, userId)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.publicId, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.publicId, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}
