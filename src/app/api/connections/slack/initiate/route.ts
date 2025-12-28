import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { buildAuthUrl, getSlackScopes } from "@/lib/connections/slack-client";

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate secure state parameter
    const state = randomBytes(32).toString("hex");

    // Store state in cookie for verification in callback
    const cookieStore = await cookies();
    cookieStore.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // Store provider in cookie
    cookieStore.set("oauth_provider", "slack", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // Store Slack-specific scopes for verification in callback
    const slackScopes = getSlackScopes();
    cookieStore.set("oauth_scopes", JSON.stringify(slackScopes), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // Build Slack OAuth URL
    const authUrl = buildAuthUrl(state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error initiating Slack OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
