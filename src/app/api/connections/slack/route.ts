import { type NextRequest, NextResponse } from "next/server";
import { getConnection, revokeConnection } from "@/db/queries/connection";
import { getUser } from "@/lib/auth";
import { revokeToken } from "@/lib/connections/slack-client";
import { decryptToken } from "@/lib/connections/token-manager";

/**
 * GET /api/connections/slack
 * Check if user has an active Slack connection
 */
export async function GET(_request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get connection from database
    const connection = await getConnection(Number(user.id), "slack");

    if (!connection || connection.status !== "active") {
      return NextResponse.json({ connected: false });
    }

    // Extract team ID from providerAccountId (format: teamId-userId)
    const [teamId] = connection.providerAccountId.split("-");

    return NextResponse.json({
      connected: true,
      email: `Slack workspace (${teamId})`, // Simple display text
      team: teamId,
    });
  } catch (error) {
    console.error("Error checking Slack connection:", error);
    return NextResponse.json(
      { error: "Failed to check connection status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/connections/slack
 * Disconnect/revoke a Slack connection
 */
export async function DELETE(_request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get connection to revoke token with Slack
    const connection = await getConnection(Number(user.id), "slack");

    if (connection?.accessToken) {
      try {
        // Decrypt and revoke token with Slack
        const decryptedToken = decryptToken(connection.accessToken);
        await revokeToken(decryptedToken);
      } catch (error) {
        // Log but continue - we still want to remove from our database
        console.error("Error revoking token with Slack:", error);
      }
    }

    // Soft delete connection in database
    await revokeConnection(Number(user.id), "slack");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Slack connection:", error);
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    );
  }
}
