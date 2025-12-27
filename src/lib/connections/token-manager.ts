import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Convert hex string to buffer
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a token using AES-256-GCM
 * Returns: iv:authTag:encryptedData (all in hex)
 */
export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a token encrypted with encryptToken
 */
export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey();
  const parts = encryptedToken.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if a connection's access token is expired or will expire soon
 */
export function isTokenExpired(
  expiresAt: Date | null,
  bufferMinutes = 5
): boolean {
  if (!expiresAt) {
    return false; // No expiry time means we don't know, assume valid
  }

  const now = new Date();
  const expiryWithBuffer = new Date(
    expiresAt.getTime() - bufferMinutes * 60 * 1000
  );

  return now >= expiryWithBuffer;
}

/**
 * Refresh an access token using the refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  _provider: string
): Promise<{
  accessToken: string;
  expiresAt: Date;
  refreshToken?: string;
}> {
  const decryptedRefreshToken = decryptToken(refreshToken);

  // Use Google's token endpoint
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      refresh_token: decryptedRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    expiresAt,
    refreshToken: data.refresh_token, // Google may return a new refresh token
  };
}

/**
 * Generate a random encryption key (use this once to generate ENCRYPTION_KEY)
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString("hex");
}
