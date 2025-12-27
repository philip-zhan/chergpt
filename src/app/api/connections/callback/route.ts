import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { upsertConnection } from "@/db/queries/connection";
import { getUser } from "@/lib/auth";
import {
  exchangeCodeForTokens,
  getUserInfo,
  type Provider,
  revokeToken,
  verifyScopes,
} from "@/lib/connections/google-client";
import { encryptToken } from "@/lib/connections/token-manager";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";
  const settingsUrl = `${baseUrl}/settings`;

  // Handle error from Google
  if (error) {
    console.error("OAuth error:", error);
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
    const provider = cookieStore.get("oauth_provider")?.value as Provider;
    const providerScopesJson = cookieStore.get("oauth_scopes")?.value;

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        `${settingsUrl}?error=invalid_state#connections`
      );
    }

    if (!provider) {
      return NextResponse.redirect(
        `${settingsUrl}?error=missing_provider#connections`
      );
    }

    // Clear state cookies
    cookieStore.delete("oauth_state");
    cookieStore.delete("oauth_provider");
    cookieStore.delete("oauth_scopes");

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Verify that provider-specific scopes were granted
    // (we don't verify default openid/email/profile scopes)
    try {
      const providerScopes = JSON.parse(providerScopesJson || "[]") as string[];
      const scopeVerification = verifyScopes(providerScopes, tokens.scope);

      if (!scopeVerification.valid) {
        console.error(
          "Scope mismatch. Missing provider-specific scopes:",
          scopeVerification.missing
        );

        // Revoke the token since it doesn't have the required permissions
        // This ensures a clean slate when the user tries to connect again
        await revokeToken(tokens.accessToken);

        return NextResponse.redirect(
          `${settingsUrl}?error=insufficient_permissions#connections`
        );
      }
    } catch (error) {
      console.error("Error verifying scopes:", error);
      // Continue anyway if scope verification fails to parse
    }

    // Get user info from Google
    const googleUser = await getUserInfo(tokens.accessToken);

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken
      ? encryptToken(tokens.refreshToken)
      : null;

    // Store connection in database
    await upsertConnection({
      userId: Number(user.id),
      provider,
      providerAccountId: googleUser.email,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      accessTokenExpiresAt: tokens.expiresAt,
      scope: tokens.scope,
      status: "active",
    });

    // Redirect back to settings with success
    return NextResponse.redirect(
      `${settingsUrl}?success=connected#connections`
    );
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return NextResponse.redirect(
      `${settingsUrl}?error=callback_failed#connections`
    );
  }
}
