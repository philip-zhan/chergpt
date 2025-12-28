/**
 * Slack OAuth Client
 * Handles OAuth 2.0 flow for Slack workspace connections
 */

// Slack OAuth scopes
const SLACK_SCOPES = [
  "channels:read", // View basic information about public channels
  "channels:history", // View messages and other content in public channels
];

interface SlackOAuthTokenResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id?: string;
  app_id: string;
  team: {
    id: string;
    name: string;
  };
  enterprise?: {
    id: string;
    name: string;
  };
  authed_user: {
    id: string;
    scope?: string;
    access_token?: string;
    token_type?: string;
  };
  error?: string;
}

interface SlackAuthTestResponse {
  ok: boolean;
  url: string;
  team: string;
  user: string;
  team_id: string;
  user_id: string;
  bot_id?: string;
  error?: string;
}

/**
 * Get Slack OAuth configuration
 */
function getSlackConfig() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://redirectmeto.com/http://localhost:3000"}/api/connections/slack/callback`;

  if (!clientId || !clientSecret) {
    throw new Error(
      "SLACK_CLIENT_ID and SLACK_CLIENT_SECRET must be set in environment variables"
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

/**
 * Build the Slack OAuth authorization URL
 */
export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = getSlackConfig();
  const scopes = SLACK_SCOPES.join(",");

  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  scope: string;
  teamId: string;
  teamName: string;
  userId: string;
}> {
  const { clientId, clientSecret, redirectUri } = getSlackConfig();

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.statusText}`);
  }

  const data: SlackOAuthTokenResponse = await response.json();

  if (!data.ok) {
    throw new Error(`Slack OAuth error: ${data.error || "Unknown error"}`);
  }

  if (!data.access_token) {
    throw new Error("No access token received from Slack");
  }

  return {
    accessToken: data.access_token, // Bot token
    scope: data.scope,
    teamId: data.team.id,
    teamName: data.team.name,
    userId: data.authed_user.id,
  };
}

/**
 * Revoke a Slack access token
 */
export async function revokeToken(token: string): Promise<void> {
  try {
    const response = await fetch("https://slack.com/api/auth.revoke", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = await response.json();

    if (!data.ok) {
      console.warn("Failed to revoke Slack token:", data.error);
      // Don't throw - token might already be invalid
    }
  } catch (error) {
    console.error("Error revoking Slack token:", error);
    // Don't throw - we still want to remove from database
  }
}

/**
 * Get the Slack-specific scopes (for verification)
 */
export function getSlackScopes(): string[] {
  return [...SLACK_SCOPES];
}

/**
 * Verify that all requested scopes were granted
 */
export function verifyScopes(
  requestedScopes: string[],
  grantedScope: string
): { valid: boolean; missing: string[] } {
  const grantedScopes = grantedScope.split(",").filter(Boolean);
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

/**
 * Test if a token is still valid
 */
export async function testToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://slack.com/api/auth.test", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data: SlackAuthTestResponse = await response.json();
    return data.ok;
  } catch {
    return false;
  }
}
