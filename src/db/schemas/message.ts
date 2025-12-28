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
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  inputTokenDetails: json("inputTokenDetails"),
  outputTokenDetails: json("outputTokenDetails"),
  totalTokens: integer("totalTokens"),
});

export type DBMessage = InferSelectModel<typeof message>;
