import type { InferSelectModel } from "drizzle-orm";
import {
  integer,
  json,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { chat } from "./chat";

export const message = pgTable("message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("created_at").notNull(),
  inputTokenDetails: json("input_token_details"),
  outputTokenDetails: json("output_token_details"),
  totalTokens: integer("total_tokens"),
});

export type DBMessage = InferSelectModel<typeof message>;
