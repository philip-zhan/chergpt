import { google } from "googleapis";

export type Provider = "gmail" | "google-calendar" | "google-drive";

const PROVIDER_SCOPES: Record<Provider, string[]> = {
  gmail: ["https://www.googleapis.com/auth/gmail.readonly"],
  "google-calendar": ["https://www.googleapis.com/auth/calendar.readonly"],
  "google-drive": ["https://www.googleapis.com/auth/drive.readonly"],
};

const DEFAULT_SCOPES: string[] = ["openid", "email", "profile"];

/**
 * Get the OAuth2 client configured with credentials
 */
export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/connections/callback`;

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables"
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Build the authorization URL for a specific provider
 */
export function buildAuthUrl(provider: Provider, state: string): string {
  const oauth2Client = getOAuthClient();
  const scopes = [...DEFAULT_SCOPES, ...PROVIDER_SCOPES[provider]];
  return oauth2Client.generateAuthUrl({
    access_type: "offline", // Request refresh token
    scope: scopes,
    state,
    prompt: "consent", // Force consent to always get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuthClient();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("No access token received");
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: tokens.scope || "",
  };
}

/**
 * Get user info (email) from Google using access token
 */
export async function getUserInfo(accessToken: string): Promise<{
  email: string;
  id: string;
}> {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  if (!data.email || !data.id) {
    throw new Error("Failed to get user email from Google");
  }

  return {
    email: data.email,
    id: data.id,
  };
}

/**
 * Revoke a token with Google
 */
export async function revokeToken(token: string): Promise<void> {
  const oauth2Client = getOAuthClient();

  try {
    await oauth2Client.revokeToken(token);
  } catch (error) {
    // Log but don't throw - revocation might fail if token already invalid
    console.error("Failed to revoke token with Google:", error);
  }
}

/**
 * Get only the provider-specific scopes (without default openid/email/profile)
 */
export function getProviderSpecificScopes(provider: Provider): string[] {
  return PROVIDER_SCOPES[provider];
}

/**
 * Verify that all requested scopes were granted
 * @param requestedScopes - Array of scope strings that were requested
 * @param grantedScope - Space-separated string of granted scopes from the token response
 * @returns true if all requested scopes are present in granted scopes
 */
export function verifyScopes(
  requestedScopes: string[],
  grantedScope: string
): { valid: boolean; missing: string[] } {
  const grantedScopes = grantedScope.split(" ").filter(Boolean);
  const missing: string[] = [];

  for (const requested of requestedScopes) {
    if (!grantedScopes.includes(requested)) {
      missing.push(requested);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
