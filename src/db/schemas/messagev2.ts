import type { InferSelectModel } from "drizzle-orm";
import { integer, json, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { chat } from "./chatv2";

export const message = pgTable("messagev2", {
  id: integer("id").primaryKey().notNull().generatedAlwaysAsIdentity(),
  publicId: text("public_id").notNull().unique(),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chat.id),
  role: text("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("created_at").notNull(),
  inputTokenDetails: json("input_token_details"),
  outputTokenDetails: json("output_token_details"),
  totalTokens: integer("total_tokens"),
});

export type DBMessage = InferSelectModel<typeof message>;
