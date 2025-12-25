import { AuthView } from "@daveyplate/better-auth-ui";
import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Authentication",
};

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-4 self-center bg-background py-18 sm:py-22">
      <Link className="absolute top-6 left-8" href="/">
        <Button
          className="hover:bg-secondary hover:text-secondary-foreground"
          size="sm"
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>

      <AuthView path={path} />

      {["sign-up"].includes(path) && (
        <div className="text-center text-muted-foreground text-sm">
          <p>
            By continuing, you agree to our{" "}
            <Link className="underline hover:text-foreground" href="/terms">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link className="underline hover:text-foreground" href="/privacy">
              Privacy Policy
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
