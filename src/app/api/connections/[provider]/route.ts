import { type NextRequest, NextResponse } from "next/server";
import { getConnection, revokeConnection } from "@/db/queries/connection";
import { getUser } from "@/lib/auth";
import { revokeToken as revokeGoogleToken } from "@/lib/connections/google-client";
import { revokeToken as revokeSlackToken } from "@/lib/connections/slack-client";
import { decryptToken } from "@/lib/connections/token-manager";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

/**
 * DELETE /api/connections/[provider]
 * Disconnect/revoke a connection
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { provider } = await context.params;

    // Verify user is authenticated
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get connection to revoke token with provider
    const connection = await getConnection(Number(user.id), provider);

    if (connection?.accessToken) {
      try {
        // Decrypt and revoke token with provider
        const decryptedToken = decryptToken(connection.accessToken);
        if (
          provider === "gmail" ||
          provider === "google-calendar" ||
          provider === "google-drive"
        ) {
          await revokeGoogleToken(decryptedToken);
        } else if (provider === "slack") {
          await revokeSlackToken(decryptedToken);
        }
      } catch (error) {
        // Log but continue - we still want to remove from our database
        console.error(`Error revoking token with ${provider}:`, error);
      }
    }

    // Soft delete connection in database
    await revokeConnection(Number(user.id), provider);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting connection:", error);
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    );
  }
}
