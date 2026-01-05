import type { InferSelectModel } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const chat = pgTable("chatv2", {
  id: integer("id").primaryKey().notNull().generatedAlwaysAsIdentity(),
  publicId: text("public_id").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  title: text("title").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => user.id),
  visibility: text("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;
