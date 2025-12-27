import { and, eq, lt } from "drizzle-orm";
import { db } from "..";
import { connection } from "../schemas/connection";

export type Connection = typeof connection.$inferSelect;
export type ConnectionInsert = typeof connection.$inferInsert;

/**
 * Get a user's connection by provider
 */
export async function getConnection(
  userId: number,
  provider: string
): Promise<Connection | null> {
  const result = await db
    .select()
    .from(connection)
    .where(
      and(eq(connection.userId, userId), eq(connection.provider, provider))
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Get all connections for a user
 */
export function getUserConnections(userId: number): Promise<Connection[]> {
  return db
    .select()
    .from(connection)
    .where(eq(connection.userId, userId))
    .orderBy(connection.createdAt);
}

/**
 * Create or update a connection
 */
export async function upsertConnection(
  data: ConnectionInsert
): Promise<Connection> {
  const existing = await getConnection(data.userId, data.provider);

  if (existing) {
    // Update existing connection
    const updated = await db
      .update(connection)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(connection.id, existing.id))
      .returning();

    return updated[0];
  }

  // Insert new connection
  const inserted = await db.insert(connection).values(data).returning();
  return inserted[0];
}

/**
 * Soft delete a connection by updating status to 'revoked'
 */
export async function revokeConnection(
  userId: number,
  provider: string
): Promise<void> {
  await db
    .update(connection)
    .set({
      status: "revoked",
      accessToken: "",
      refreshToken: null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(connection.userId, userId), eq(connection.provider, provider))
    );
}

/**
 * Get connections that are expiring soon and need token refresh
 */
export function getExpiringSoonConnections(
  minutesFromNow = 5
): Promise<Connection[]> {
  const expiryThreshold = new Date(Date.now() + minutesFromNow * 60 * 1000);

  return db
    .select()
    .from(connection)
    .where(
      and(
        eq(connection.status, "active"),
        lt(connection.accessTokenExpiresAt, expiryThreshold)
      )
    );
}

/**
 * Update connection tokens after refresh
 */
export function updateConnectionTokens(
  connectionId: number,
  accessToken: string,
  expiresAt: Date,
  refreshToken?: string
): Promise<void> {
  const updateData: Partial<ConnectionInsert> = {
    accessToken,
    accessTokenExpiresAt: expiresAt,
    updatedAt: new Date(),
  };

  if (refreshToken) {
    updateData.refreshToken = refreshToken;
  }

  return db
    .update(connection)
    .set(updateData)
    .where(eq(connection.id, connectionId))
    .then(() => undefined);
}

/**
 * Update last synced time for a connection
 */
export function updateLastSynced(connectionId: number): Promise<void> {
  return db
    .update(connection)
    .set({
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(connection.id, connectionId))
    .then(() => undefined);
}
