import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const connection = pgTable(
  "connection",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'gmail', 'google-calendar', 'google-drive', 'slack'
    providerAccountId: text("provider_account_id").notNull(), // Provider-specific account ID (email for Google, user ID for Slack)
    providerOrgId: text("provider_org_id"), // Organization/workspace ID (Slack team ID, etc.)
    accessToken: text("access_token").notNull(), // Encrypted
    refreshToken: text("refresh_token"), // Encrypted
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    scope: text("scope").notNull(),
    status: text("status").default("active").notNull(), // 'active', 'revoked', 'error'
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    connection_userId_idx: index("connection_userId_idx").on(table.userId),
    connection_userId_provider_uidx: uniqueIndex(
      "connection_userId_provider_uidx"
    ).on(table.userId, table.provider),
  })
);

export const connectionRelations = relations(connection, ({ one }) => ({
  user: one(user, {
    fields: [connection.userId],
    references: [user.id],
  }),
}));
