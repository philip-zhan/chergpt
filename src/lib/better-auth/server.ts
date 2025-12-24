import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, apiKey, organization } from "better-auth/plugins";
import { headers } from "next/headers";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [admin(), apiKey(), organization()],
});

export async function getOrganizationId() {
  const session = await getSession();
  const organizationId = session?.activeOrganizationId;
  return organizationId;
}

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("No session found");
  }
  return session.session;
}

export async function getUserId() {
  const session = await getSession();
  const userId = session?.userId;
  if (!userId) {
    throw new Error("No user ID found");
  }
  return userId;
}
