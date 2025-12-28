import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { upsertConnection } from "@/db/queries/connection";
import { getUser } from "@/lib/auth";
import {
  exchangeCodeForTokens,
  revokeToken,
  verifyScopes,
} from "@/lib/connections/slack-client";
import { encryptToken } from "@/lib/connections/token-manager";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const settingsUrl = `${baseUrl}/settings`;

  // Handle error from Slack
  if (error) {
    console.error("Slack OAuth error:", error);
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(error)}#connections`
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      `${settingsUrl}?error=missing_parameters#connections`
    );
  }

  try {
    // Verify user is authenticated
    const user = await getUser();
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/auth/login`);
    }

    // Verify state parameter
    const cookieStore = await cookies();
    const savedState = cookieStore.get("oauth_state")?.value;
    const provider = cookieStore.get("oauth_provider")?.value;
    const providerScopesJson = cookieStore.get("oauth_scopes")?.value;

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        `${settingsUrl}?error=invalid_state#connections`
      );
    }

    if (provider !== "slack") {
      return NextResponse.redirect(
        `${settingsUrl}?error=invalid_provider#connections`
      );
    }

    // Clear state cookies
    cookieStore.delete("oauth_state");
    cookieStore.delete("oauth_provider");
    cookieStore.delete("oauth_scopes");

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Verify that requested scopes were granted
    try {
      const requestedScopes = JSON.parse(
        providerScopesJson || "[]"
      ) as string[];
      const scopeVerification = verifyScopes(requestedScopes, tokens.scope);

      if (!scopeVerification.valid) {
        console.error(
          "Scope mismatch. Missing Slack scopes:",
          scopeVerification.missing
        );

        // Revoke the token since it doesn't have the required permissions
        await revokeToken(tokens.accessToken);

        return NextResponse.redirect(
          `${settingsUrl}?error=insufficient_permissions#connections`
        );
      }
    } catch (error) {
      console.error("Error verifying scopes:", error);
      // Continue anyway if scope verification fails to parse
    }

    // Encrypt bot token before storing
    const encryptedAccessToken = encryptToken(tokens.accessToken);

    // Store connection in database
    // Note: Slack tokens typically don't expire, so we set expiresAt to null
    await upsertConnection({
      userId: Number(user.id),
      provider: "slack",
      providerAccountId: tokens.userId,
      providerOrgId: tokens.teamId,
      accessToken: encryptedAccessToken,
      refreshToken: null, // Slack doesn't use refresh tokens
      accessTokenExpiresAt: null, // Slack tokens don't expire
      scope: tokens.scope,
      status: "active",
    });

    // Redirect back to settings with success
    return NextResponse.redirect(
      `${settingsUrl}?success=connected#connections`
    );
  } catch (error) {
    console.error("Error in Slack OAuth callback:", error);
    return NextResponse.redirect(
      `${settingsUrl}?error=callback_failed#connections`
    );
  }
}
