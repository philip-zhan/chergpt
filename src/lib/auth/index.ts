import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, apiKey, organization } from "better-auth/plugins";
import { headers } from "next/headers";
import { db } from "@/db";
// biome-ignore lint: Namespace imports are not allowed.
import * as schema from "@/db/schemas/auth";

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    async sendResetPassword() {
      // TODO: Send an email to the user with a link to reset their password
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // prompt: "select_account",
    },
  },
  plugins: [admin(), apiKey(), organization()],
  advanced: {
    database: {
      generateId: "serial",
    },
  },
});

async function _getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("No session found");
  }
  return session;
}

export async function getSession() {
  const session = await _getSession();
  return session.session;
}

export async function getUser() {
  const session = await _getSession();
  return session.user;
}
