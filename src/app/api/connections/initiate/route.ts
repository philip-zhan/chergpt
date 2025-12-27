import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import {
  buildAuthUrl,
  getProviderScopes,
  type Provider,
} from "@/lib/connections/google-client";

const VALID_PROVIDERS: Provider[] = [
  "gmail",
  "google-calendar",
  "google-drive",
];

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { provider } = body;

    // Validate provider
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        {
          error:
            "Invalid provider. Must be one of: gmail, google-calendar, google-drive",
        },
        { status: 400 }
      );
    }

    // Generate secure state parameter
    const state = randomBytes(32).toString("hex");

    // Store state in cookie with user ID for verification in callback
    const cookieStore = await cookies();
    cookieStore.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // Store provider in cookie as well
    cookieStore.set("oauth_provider", provider, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // Store requested scopes for verification in callback
    const requestedScopes = getProviderScopes(provider as Provider);
    cookieStore.set("oauth_scopes", JSON.stringify(requestedScopes), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // Build OAuth URL
    const authUrl = buildAuthUrl(provider as Provider, state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error initiating OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
