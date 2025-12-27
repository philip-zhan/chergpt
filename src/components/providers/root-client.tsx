"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { authClient } from "@/lib/auth/client";

export function RootProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        <AuthUIProvider
          account={{
            basePath: "/settings",
            viewPaths: {
              SETTINGS: "#account",
              SECURITY: "#security",
              API_KEYS: "#security",
              ORGANIZATIONS: "#organizations",
              TEAMS: "#organizations",
            },
          }}
          apiKey={{
            prefix: "ngk_",
          }}
          authClient={authClient}
          avatar={
            {
              // upload: avatarUploader,
            }
          }
          // Link={Link}
          navigate={router.push}
          onSessionChange={() => {
            router.refresh();
          }}
          // organization={{
          //   logo: {
          //     // upload: avatarUploader,
          //   },
          //   basePath: "/dashboard/organization",
          //   viewPaths: {
          //     SETTINGS: "#settings",
          //     MEMBERS: "#members",
          //     API_KEYS: "#api-keys",
          //   },
          // }}
          replace={router.replace}
          social={{
            providers: ["google"],
          }}
        >
          {children}
          <Toaster />
        </AuthUIProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
