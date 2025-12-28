import { getUser } from "@/lib/auth";
import { getConnection } from "./connection";

export interface ConnectionStatus {
  connected: boolean;
  accountId?: string;
  orgId?: string;
}

export type ConnectionStatuses = Record<string, ConnectionStatus>;

/**
 * Get connection statuses for multiple providers for the current user
 * Server-side only function
 */
export async function getConnectionStatuses(
  providers: string[]
): Promise<ConnectionStatuses> {
  const user = await getUser();

  if (!user) {
    // Return empty states if not authenticated
    return providers.reduce((acc, provider) => {
      acc[provider] = { connected: false };
      return acc;
    }, {} as ConnectionStatuses);
  }

  const statuses: ConnectionStatuses = {};

  // Fetch all connections in parallel
  await Promise.all(
    providers.map(async (provider) => {
      try {
        const connection = await getConnection(Number(user.id), provider);

        if (!connection || connection.status !== "active") {
          statuses[provider] = { connected: false };
        } else {
          statuses[provider] = {
            connected: true,
            accountId: connection.providerAccountId || undefined,
            orgId: connection.providerOrgId || undefined,
          };
        }
      } catch (error) {
        console.error(`Error fetching ${provider} status:`, error);
        statuses[provider] = { connected: false };
      }
    })
  );

  return statuses;
}
