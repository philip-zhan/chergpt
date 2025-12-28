import { getConnectionStatuses } from "@/db/queries/connection-status";
import { ConnectionsCardClient } from "./connections-card";

// List of providers that have initiate endpoints
const AVAILABLE_PROVIDERS = [
  "gmail",
  "google-calendar",
  "google-drive",
  "slack",
];

/**
 * Server component wrapper that fetches initial connection statuses
 * and passes them to the client component
 */
export async function ConnectionsCard() {
  // Fetch connection statuses server-side
  const initialConnectionStatuses =
    await getConnectionStatuses(AVAILABLE_PROVIDERS);

  return (
    <ConnectionsCardClient
      initialConnectionStatuses={initialConnectionStatuses}
    />
  );
}
