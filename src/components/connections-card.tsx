"use client";

import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Connection {
  id: string;
  name: string;
  description: string;
  iconSrc: string;
  connected: boolean;
  comingSoon: boolean;
  email?: string;
  loading?: boolean;
}

interface ConnectionStatusResponse {
  connected: boolean;
  email?: string;
}

const connections: Connection[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Connect your Gmail account for email notifications",
    iconSrc: "/images/Gmail/Gmail.svg",
    connected: false,
    comingSoon: false,
  },

  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync your calendar events and schedule meetings",
    iconSrc: "/images/google-calendar.svg",
    connected: false,
    comingSoon: false,
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Access and manage your Google Drive files",
    iconSrc: "/images/google-drive.svg",
    connected: false,
    comingSoon: false,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Connect your Slack workspace for notifications and updates",
    iconSrc: "/images/slack.svg",
    connected: false,
    comingSoon: false,
  },
  {
    id: "github",
    name: "GitHub",
    description: "Integrate with GitHub repositories and issues",
    iconSrc: "/images/github.svg",
    connected: false,
    comingSoon: true,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Connect your Notion workspace for seamless collaboration",
    iconSrc: "/images/Notion/Notion_Symbol_0.svg",
    connected: false,
    comingSoon: true,
  },
  {
    id: "linear",
    name: "Linear",
    description: "Manage issues and track project progress",
    iconSrc: "/images/Linear/Linear_Symbol_0.svg",
    connected: false,
    comingSoon: true,
  },
];

// Fetch connection status for a provider
async function fetchConnectionStatus(
  provider: string
): Promise<ConnectionStatusResponse> {
  const response = await fetch(`/api/connections/${provider}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${provider} status`);
  }
  return response.json();
}

// Initiate OAuth connection
async function initiateConnection(
  provider: string
): Promise<{ authUrl: string }> {
  // Route to the appropriate initiate endpoint based on provider
  const endpoint =
    provider === "slack"
      ? "/api/connections/slack/initiate"
      : "/api/connections/initiate";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });

  if (!response.ok) {
    throw new Error("Failed to initiate OAuth");
  }

  return response.json();
}

// Disconnect a provider
async function disconnectProvider(provider: string): Promise<void> {
  const response = await fetch(`/api/connections/${provider}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to disconnect");
  }
}

export function ConnectionsCard() {
  const queryClient = useQueryClient();

  // Get list of available providers (non-coming-soon)
  const availableProviders = connections
    .filter((c) => !c.comingSoon)
    .map((c) => c.id);

  // Fetch connection status for all providers using useQueries
  const connectionQueries = useQueries({
    queries: availableProviders.map((provider) => ({
      queryKey: ["connection-status", provider],
      queryFn: () => fetchConnectionStatus(provider),
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    })),
  });

  // Create a map of provider to status
  const connectionStates = availableProviders.reduce(
    (acc, provider, index) => {
      const query = connectionQueries[index];
      acc[provider] = {
        connected: query.data?.connected ?? false,
        email: query.data?.email,
        isLoading: query.isLoading,
      };
      return acc;
    },
    {} as Record<
      string,
      { connected: boolean; email?: string; isLoading: boolean }
    >
  );

  // Mutation for initiating connection
  const initiateMutation = useMutation({
    mutationFn: initiateConnection,
    onSuccess: (data) => {
      // Redirect to OAuth URL
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      console.error("Error initiating OAuth:", error);
      toast.error("Connection failed", {
        description: "Failed to start connection. Please try again.",
      });
    },
  });

  // Mutation for disconnecting
  const disconnectMutation = useMutation({
    mutationFn: disconnectProvider,
    onSuccess: (_, provider) => {
      // Invalidate and refetch the connection status
      queryClient.invalidateQueries({
        queryKey: ["connection-status", provider],
      });
      toast.success("Disconnected", {
        description: "Your account has been disconnected.",
      });
    },
    onError: (error) => {
      console.error("Error disconnecting:", error);
      toast.error("Disconnection failed", {
        description: "Failed to disconnect. Please try again.",
      });
    },
  });

  // Handle OAuth callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "connected") {
      toast.success("Connection successful", {
        description: "Your account has been connected.",
      });
      // Clean up URL
      window.history.replaceState({}, "", "/settings#connections");
      // Refetch all connection statuses
      queryClient.invalidateQueries({ queryKey: ["connection-status"] });
    } else if (params.get("error")) {
      const errorType = params.get("error");
      let errorMessage = "Failed to connect your account. Please try again.";

      // Provide specific error messages
      if (errorType === "insufficient_permissions") {
        errorMessage =
          "You need to grant all requested permissions to connect this service.";
      } else if (errorType === "invalid_state") {
        errorMessage = "Security validation failed. Please try again.";
      } else if (errorType === "missing_provider") {
        errorMessage = "Invalid connection request. Please try again.";
      } else if (errorType) {
        errorMessage = `Connection failed: ${errorType}. Please try again.`;
      }

      toast.error("Connection failed", {
        description: errorMessage,
      });
      window.history.replaceState({}, "", "/settings#connections");
    }
  }, [queryClient]);

  const handleConnect = (connectionId: string) => {
    initiateMutation.mutate(connectionId);
  };

  const handleDisconnect = (connectionId: string) => {
    disconnectMutation.mutate(connectionId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Apps</CardTitle>
        <CardDescription>
          Manage your integrations with third-party applications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.map((connection) => {
          const state = connectionStates[connection.id];
          const isConnected = state?.connected || false;
          const isLoading =
            state?.isLoading ||
            (initiateMutation.isPending &&
              initiateMutation.variables === connection.id) ||
            (disconnectMutation.isPending &&
              disconnectMutation.variables === connection.id);
          const email = state?.email;

          return (
            <div
              className="flex items-center justify-between gap-4 rounded-lg border p-4"
              key={connection.id}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Image
                    alt={connection.name}
                    className="h-5 w-5"
                    height={20}
                    src={connection.iconSrc}
                    width={20}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium leading-none">
                      {connection.name}
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isConnected && email
                      ? `Connected as ${email}`
                      : connection.description}
                  </p>
                </div>
              </div>
              <div>
                {isConnected ? (
                  <Button
                    disabled={isLoading}
                    onClick={() => handleDisconnect(connection.id)}
                    size="sm"
                    variant="outline"
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    disabled={connection.comingSoon || isLoading}
                    onClick={() => handleConnect(connection.id)}
                    size="sm"
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {connection.comingSoon ? "Coming soon" : "Connect"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
