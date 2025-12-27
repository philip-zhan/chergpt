"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
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
    comingSoon: true,
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

export function ConnectionsCard() {
  const [connectionStates, setConnectionStates] = useState<
    Record<string, { connected: boolean; email?: string; loading: boolean }>
  >({});

  // Fetch connection status on mount
  useEffect(() => {
    const fetchConnectionStatus = async () => {
      const providers = ["gmail", "google-calendar", "google-drive"];

      for (const provider of providers) {
        try {
          const response = await fetch(`/api/connections/${provider}`);
          if (response.ok) {
            const data = await response.json();
            setConnectionStates((prev) => ({
              ...prev,
              [provider]: {
                connected: data.connected,
                email: data.email,
                loading: false,
              },
            }));
          }
        } catch (error) {
          console.error(`Error fetching ${provider} status:`, error);
        }
      }
    };

    fetchConnectionStatus();

    // Check for OAuth callback success/error in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "connected") {
      toast.success("Connection successful", {
        description: "Your account has been connected.",
      });
      // Clean up URL
      window.history.replaceState({}, "", "/settings#connections");
      // Refresh connection status
      fetchConnectionStatus();
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
  }, []);

  const handleConnect = async (connectionId: string) => {
    setConnectionStates((prev) => ({
      ...prev,
      [connectionId]: { ...prev[connectionId], loading: true },
    }));

    try {
      const response = await fetch("/api/connections/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: connectionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate OAuth");
      }

      const data = await response.json();
      // Redirect to OAuth URL
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Error initiating OAuth:", error);
      toast.error("Connection failed", {
        description: "Failed to start connection. Please try again.",
      });
      setConnectionStates((prev) => ({
        ...prev,
        [connectionId]: { ...prev[connectionId], loading: false },
      }));
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    setConnectionStates((prev) => ({
      ...prev,
      [connectionId]: { ...prev[connectionId], loading: true },
    }));

    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      setConnectionStates((prev) => ({
        ...prev,
        [connectionId]: { connected: false, loading: false },
      }));

      toast.success("Disconnected", {
        description: "Your account has been disconnected.",
      });
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Disconnection failed", {
        description: "Failed to disconnect. Please try again.",
      });
      setConnectionStates((prev) => ({
        ...prev,
        [connectionId]: { ...prev[connectionId], loading: false },
      }));
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
          const state = connectionStates[connection.id];
          const isConnected = state?.connected || false;
          const isLoading = state?.loading || false;
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
