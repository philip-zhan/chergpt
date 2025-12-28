# Slack OAuth Connection Setup Guide

This guide explains how to set up and test the Slack OAuth connection for your workspace.

## Prerequisites

1. A Slack workspace where you have admin privileges (or can create apps)
2. The application running locally or deployed

## Slack App Setup

### 1. Create a Slack App

1. Go to [Slack API Dashboard](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. Enter your app name (e.g., "Your App Name")
5. Select the workspace where you want to develop the app
6. Click "Create App"

### 2. Configure OAuth & Permissions

1. In the left sidebar, click "OAuth & Permissions"
2. Scroll down to "Redirect URLs"
3. Click "Add New Redirect URL"
4. Add your redirect URLs:
   - For local development: `http://localhost:3000/api/connections/slack/callback`
   - For production: `https://yourdomain.com/api/connections/slack/callback`
5. Click "Save URLs"

### 3. Add Bot Token Scopes

Scroll down to "Scopes" section and add the following **Bot Token Scopes**:

- `channels:read` - View basic information about public channels
- `channels:history` - View messages and other content in public channels

### 4. Add User Token Scopes

In the same "Scopes" section, add the following **User Token Scopes**:

- `identity.basic` - View basic information about the user
- `identity.email` - View the user's email address

### 5. Get Your Credentials

1. Scroll back to the top of the "OAuth & Permissions" page
2. Or go to "Basic Information" in the left sidebar
3. Under "App Credentials", you'll find:
   - **Client ID**
   - **Client Secret** (click "Show" to reveal)
4. Copy both values

## Environment Variables

Add the following to your `.env.local` file:

```bash
# Slack OAuth
SLACK_CLIENT_ID=your_slack_client_id_here
SLACK_CLIENT_SECRET=your_slack_client_secret_here

# Token Encryption Key (if not already set)
ENCRYPTION_KEY=your_64_character_hex_key_here
```

### Generate Encryption Key

If you don't already have an `ENCRYPTION_KEY`, run this command to generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `ENCRYPTION_KEY`.

## Database Migration

The connection table already supports Slack. No additional migrations are needed.

If you need to verify the schema:

```bash
pnpm db:studio
```

## Testing the OAuth Flow

### 1. Start the Development Server

```bash
pnpm dev
```

### 2. Navigate to Settings

1. Open your browser and go to `http://localhost:3000`
2. Log in to your account
3. Navigate to Settings
4. Click on the "Connections" tab

### 3. Test Slack Connection

1. Click "Connect" on the Slack card
2. You'll be redirected to Slack's OAuth consent screen
3. Review the permissions being requested:
   - View basic information about public channels
   - View messages in public channels
   - View your identity information
4. Click "Allow" to grant permissions
5. You'll be redirected back to the settings page
6. The Slack card should now show "Connected as [Team ID-User ID]"

### 4. Test Disconnection

1. Click "Disconnect" on the Slack connection
2. Verify the connection status changes back to "Connect"
3. The token should be revoked with Slack

## Verifying the Implementation

### Check Database

You can verify connections are stored correctly:

```bash
pnpm db:studio
```

Look at the `connection` table to see:
- `provider`: Should be "slack"
- `providerAccountId`: Format is `{teamId}-{userId}` (e.g., "T01234-U56789")
- `accessToken`: Encrypted token
- `refreshToken`: NULL (Slack doesn't use refresh tokens)
- `accessTokenExpiresAt`: NULL (Slack tokens don't expire unless revoked)
- `scope`: Comma-separated list of granted scopes
- `status`: Should be "active"

### API Endpoints

Test the API endpoints directly (requires authentication):

```bash
# Get connection status
curl http://localhost:3000/api/connections/slack

# Initiate OAuth flow
curl -X POST http://localhost:3000/api/connections/slack/initiate

# Disconnect
curl -X DELETE http://localhost:3000/api/connections/slack
```

## Troubleshooting

### "Invalid redirect_uri"

- Make sure you've added the correct redirect URI in your Slack App settings
- Verify the redirect URI matches exactly (including protocol and port)
- Check that your `NEXT_PUBLIC_APP_URL` environment variable is set correctly

### "Missing scopes" or "insufficient_permissions" error

- Verify you've added all required scopes in your Slack App settings:
  - Bot Token Scopes: `channels:read`, `channels:history`
  - User Token Scopes: `identity.basic`, `identity.email`
- Try disconnecting and reconnecting after adding scopes
- You may need to reinstall the app to your workspace after scope changes

### "Invalid state parameter"

- This is a security feature to prevent CSRF attacks
- Clear your browser cookies and try again
- Make sure cookies are enabled in your browser

### Connection shows as disconnected after page refresh

- Check browser console for API errors
- Verify the `/api/connections/slack` endpoint is returning correct data
- Check that the user session is valid

### "Unauthorized" or "401" errors

- Ensure you're logged in to your application
- Check that your session is still valid
- Try logging out and logging back in

## Key Differences from Google OAuth

1. **No Refresh Tokens**: Slack access tokens don't expire by default (unless manually revoked)
2. **Team Context**: Slack connections are tied to a specific workspace/team
3. **Provider Account ID**: Uses format `{teamId}-{userId}` instead of just email
4. **Scope Format**: Slack uses comma-separated scopes instead of space-separated
5. **API Structure**: Slack OAuth v2 uses different endpoint structure than Google

## Security Considerations

1. **Token Encryption**: All tokens are encrypted at rest using AES-256-GCM
2. **HTTPS Only**: In production, always use HTTPS for OAuth redirects
3. **State Parameter**: CSRF protection is implemented via state validation
4. **Scope Minimization**: Only request the scopes you need
5. **Token Revocation**: Tokens are revoked with Slack when disconnecting
6. **Secure Storage**: Encryption key must be kept secret and not committed to version control

## Using the Slack Connection

After successfully connecting Slack, you can use the connection to:

1. Read channel information
2. Access channel history and messages
3. Build Slack integrations into your AI assistant
4. Fetch team and workspace information

### Example: Get Connection for API Calls

```typescript
import { getConnection } from "@/db/queries/connection";
import { decryptToken } from "@/lib/connections/token-manager";

// In your server-side code
const connection = await getConnection(userId, "slack");

if (connection && connection.status === "active") {
  const accessToken = decryptToken(connection.accessToken);
  
  // Use the token to call Slack API
  const response = await fetch("https://slack.com/api/conversations.list", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  const data = await response.json();
  // Process channel data...
}
```

## Next Steps

1. Implement Slack API integrations (fetch channels, messages, etc.)
2. Add webhook support for real-time updates
3. Create Slack bot commands
4. Add more Slack scopes as needed for additional features
5. Consider adding Enterprise Grid support for larger organizations

## Files Created

- `src/lib/connections/slack-client.ts` - Slack OAuth client utilities
- `src/app/api/connections/slack/initiate/route.ts` - Start OAuth flow
- `src/app/api/connections/slack/callback/route.ts` - OAuth callback handler
- `src/app/api/connections/slack/route.ts` - Status check and disconnect

**Modified Files:**
- `src/components/connections-card.tsx` - Enabled Slack connection

## Additional Resources

- [Slack OAuth Documentation](https://api.slack.com/authentication/oauth-v2)
- [Slack API Methods](https://api.slack.com/methods)
- [Slack Scopes Reference](https://api.slack.com/scopes)
- [Slack App Management](https://api.slack.com/apps)

