"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ConnectionStatuses } from "@/db/queries/connection-status";

interface Connection {
  id: string;
  name: string;
  description: string;
  iconSrc: string;
  initiateEndpoint?: string;
}

interface ConnectionsCardClientProps {
  initialConnectionStatuses: ConnectionStatuses;
}

const connections: Connection[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Connect your Gmail account for email notifications",
    iconSrc: "/images/Gmail/Gmail.svg",
    initiateEndpoint: "/api/connections/google/initiate",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync your calendar events and schedule meetings",
    iconSrc: "/images/google-calendar.svg",
    initiateEndpoint: "/api/connections/google/initiate",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Access and manage your Google Drive files",
    iconSrc: "/images/google-drive.svg",
    initiateEndpoint: "/api/connections/google/initiate",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Connect your Slack workspace for notifications and updates",
    iconSrc: "/images/slack.svg",
    initiateEndpoint: "/api/connections/slack/initiate",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Integrate with GitHub repositories and issues",
    iconSrc: "/images/github.svg",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Connect your Notion workspace for seamless collaboration",
    iconSrc: "/images/Notion/Notion_Symbol_0.svg",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Manage issues and track project progress",
    iconSrc: "/images/Linear/Linear_Symbol_0.svg",
  },
];

// Initiate OAuth connection
async function initiateConnection(
  provider: string
): Promise<{ authUrl: string }> {
  const endpoint = connections.find((c) => c.id === provider)?.initiateEndpoint;
  if (!endpoint) {
    throw new Error(`Initiate endpoint not found for ${provider}`);
  }
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

export function ConnectionsCardClient({
  initialConnectionStatuses,
}: ConnectionsCardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null
  );
  const [disconnectingProvider, setDisconnectingProvider] = useState<
    string | null
  >(null);

  // Handle OAuth callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "connected") {
      toast.success("Connection successful", {
        description: "Your account has been connected.",
      });
      // Clean up URL and refresh server component
      window.history.replaceState({}, "", "/settings#connections");
      router.refresh();
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
  }, [router]);

  const handleConnect = async (connectionId: string) => {
    setConnectingProvider(connectionId);
    try {
      const data = await initiateConnection(connectionId);
      // Redirect to OAuth URL
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Error initiating OAuth:", error);
      toast.error("Connection failed", {
        description: "Failed to start connection. Please try again.",
      });
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    setDisconnectingProvider(connectionId);
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      toast.success("Disconnected", {
        description: "Your account has been disconnected.",
      });
      // Refresh the server component to update UI
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Disconnection failed", {
        description: "Failed to disconnect. Please try again.",
      });
    } finally {
      setDisconnectingProvider(null);
    }
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
          const status = initialConnectionStatuses[connection.id];
          const isConnected = status?.connected || false;
          const accountId = status?.accountId;
          const isComingSoon = connection.initiateEndpoint === undefined;

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
                    {isConnected && accountId
                      ? `Connected as ${accountId}`
                      : connection.description}
                  </p>
                </div>
              </div>
              <div>
                {isConnected ? (
                  <Button
                    disabled={isPending}
                    onClick={() => handleDisconnect(connection.id)}
                    size="sm"
                    variant="outline"
                  >
                    {disconnectingProvider === connection.id && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    disabled={isComingSoon || isPending}
                    onClick={() => handleConnect(connection.id)}
                    size="sm"
                  >
                    {connectingProvider === connection.id && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isComingSoon ? "Coming soon" : "Connect"}
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
