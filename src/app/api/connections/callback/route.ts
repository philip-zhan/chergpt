import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { upsertConnection } from "@/db/queries/connection";
import { getUser } from "@/lib/auth";
import {
  exchangeCodeForTokens,
  getUserInfo,
  type Provider,
} from "@/lib/connections/google-client";
import { encryptToken } from "@/lib/connections/token-manager";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";
  const settingsUrl = `${baseUrl}/settings#connections`;

  // Handle error from Google
  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(error)}`
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=missing_parameters`);
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

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=invalid_state`);
    }

    if (!provider) {
      return NextResponse.redirect(`${settingsUrl}?error=missing_provider`);
    }

    // Clear state cookies
    cookieStore.delete("oauth_state");
    cookieStore.delete("oauth_provider");

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

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
    return NextResponse.redirect(`${settingsUrl}?success=connected`);
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return NextResponse.redirect(`${settingsUrl}?error=callback_failed`);
  }
}
