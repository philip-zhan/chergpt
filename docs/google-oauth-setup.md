# Google OAuth Connections Setup Guide

This guide explains how to set up and test the Google OAuth connections for Gmail, Google Calendar, and Google Drive.

## Prerequisites

1. A Google Cloud Platform account
2. The application running locally or deployed

## Google Cloud Console Setup

### 1. Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

### 2. Enable Required APIs

Enable the following APIs in your project:

1. **Gmail API**
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

2. **Google Calendar API**
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Google Drive API**
   - Search for "Google Drive API"
   - Click "Enable"

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (or "Internal" if using Google Workspace)
3. Fill in the required fields:
   - App name: Your app name
   - User support email: Your email
   - Developer contact information: Your email
4. Click "Save and Continue"
5. Add the following scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
6. Add test users (if in testing mode)
7. Click "Save and Continue"

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - For local development: `http://localhost:3000/api/connections/google/callback`
   - For production: `https://yourdomain.com/api/connections/callback`
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

## Environment Variables

Add the following to your `.env.local` file:

```bash
# Google OAuth (you should already have these for auth)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Token Encryption Key (generate a new one)
ENCRYPTION_KEY=your_64_character_hex_key_here
```

### Generate Encryption Key

Run this command to generate a secure encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `ENCRYPTION_KEY`.

## Database Migration

The connection table has already been created. If you need to run migrations manually:

```bash
npm run db:generate  # Generate migration
npm run db:migrate   # Run migration
```

## Testing the OAuth Flow

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Navigate to Settings

1. Open your browser and go to `http://localhost:3000`
2. Log in to your account
3. Navigate to Settings
4. Click on the "Connections" tab

### 3. Test Each Connection

#### Gmail Connection

1. Click "Connect" on the Gmail card
2. You'll be redirected to Google's OAuth consent screen
3. Select your Google account
4. Review and grant the requested permissions (read-only access to Gmail)
5. You'll be redirected back to the settings page
6. The Gmail card should now show "Connected as your@email.com"

#### Google Calendar Connection

1. Click "Connect" on the Google Calendar card
2. Follow the same OAuth flow
3. Grant read-only access to your calendar
4. Verify the connection status updates

#### Google Drive Connection

1. Click "Connect" on the Google Drive card
2. Complete the OAuth flow
3. Grant read-only access to your Drive files
4. Verify the connection status updates

### 4. Test Disconnection

1. Click "Disconnect" on any connected service
2. Verify the connection status changes back to "Connect"
3. The token should be revoked with Google

## Verifying the Implementation

### Check Database

You can verify connections are stored correctly:

```bash
npm run db:studio
```

Look at the `connection` table to see:
- Encrypted access tokens
- Refresh tokens
- Expiry times
- Connection status

### Check Token Encryption

Tokens are encrypted using AES-256-GCM. You can verify:
- Access tokens and refresh tokens are encrypted in the database
- Tokens are decrypted only when needed for API calls
- Encryption key is stored securely in environment variables

### API Endpoints

Test the API endpoints directly:

```bash
# Get connection status (requires authentication)
curl http://localhost:3000/api/connections/gmail

# Initiate OAuth flow (requires authentication)
curl -X POST http://localhost:3000/api/connections/initiate \
  -H "Content-Type: application/json" \
  -d '{"provider":"gmail"}'

# Disconnect (requires authentication)
curl -X DELETE http://localhost:3000/api/connections/gmail
```

## Troubleshooting

### "Access blocked: This app's request is invalid"

- Make sure you've added the correct redirect URI in Google Cloud Console
- Verify the redirect URI matches exactly (including protocol and port)

### "Error 400: redirect_uri_mismatch"

- Check that your `NEXT_PUBLIC_APP_URL` environment variable is set correctly
- Ensure the redirect URI in Google Cloud Console matches your app's URL

### "Invalid state parameter"

- This is a security feature to prevent CSRF attacks
- Clear your browser cookies and try again
- Make sure cookies are enabled in your browser

### Tokens not refreshing

- Check that you're requesting `access_type: 'offline'` in the OAuth flow (already configured)
- Verify refresh tokens are being stored in the database
- Check the `accessTokenExpiresAt` field to see when tokens expire

### Connection shows as disconnected after page refresh

- Check browser console for API errors
- Verify the `/api/connections/[provider]` endpoint is returning correct data
- Check that the user session is valid

## Security Considerations

1. **Token Encryption**: All tokens are encrypted at rest using AES-256-GCM
2. **HTTPS Only**: In production, always use HTTPS for OAuth redirects
3. **State Parameter**: CSRF protection is implemented via state validation
4. **Scope Minimization**: Only read-only scopes are requested
5. **Token Rotation**: Tokens are refreshed before expiry
6. **Secure Storage**: Encryption key must be kept secret and not committed to version control

## Next Steps

After successfully connecting services, you can:

1. Implement data fetching from connected services
2. Add background jobs to sync data periodically
3. Use connection data to enhance AI responses
4. Add more OAuth providers (Slack, GitHub, Notion, Linear)

## Files Created

- `src/db/schemas/connection.ts` - Connection table schema
- `src/db/queries/connection.ts` - Database queries
- `src/lib/connections/token-manager.ts` - Token encryption & refresh
- `src/lib/connections/google-client.ts` - Google OAuth client
- `src/app/api/connections/initiate/route.ts` - Start OAuth flow
- `src/app/api/connections/callback/route.ts` - OAuth callback handler
- `src/app/api/connections/[provider]/route.ts` - Get/delete connections
- `src/components/connections-card.tsx` - UI component (updated)

