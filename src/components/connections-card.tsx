"use client";

import {
  Calendar,
  CheckCircle2,
  Github,
  HardDrive,
  MessageSquare,
  StickyNote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  icon: React.ReactNode;
  connected: boolean;
  category: string;
}

const connections: Connection[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Connect your Slack workspace for notifications and updates",
    icon: <MessageSquare className="h-5 w-5" />,
    connected: false,
    category: "Communication",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Integrate with GitHub repositories and issues",
    icon: <Github className="h-5 w-5" />,
    connected: false,
    category: "Development",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync your calendar events and schedule meetings",
    icon: <Calendar className="h-5 w-5" />,
    connected: false,
    category: "Productivity",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Access and manage your Google Drive files",
    icon: <HardDrive className="h-5 w-5" />,
    connected: false,
    category: "Storage",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Connect your Notion workspace for seamless collaboration",
    icon: <StickyNote className="h-5 w-5" />,
    connected: false,
    category: "Productivity",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Manage issues and track project progress",
    icon: <CheckCircle2 className="h-5 w-5" />,
    connected: false,
    category: "Development",
  },
];

export function ConnectionsCard() {
  const handleConnect = (connectionId: string) => {
    // OAuth flow will be implemented later
    console.log(`Connecting to ${connectionId}...`);
  };

  const handleDisconnect = (connectionId: string) => {
    // Disconnect logic will be implemented later
    console.log(`Disconnecting from ${connectionId}...`);
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
        {connections.map((connection) => (
          <div
            className="flex items-center justify-between gap-4 rounded-lg border p-4"
            key={connection.id}
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                {connection.icon}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium leading-none">
                    {connection.name}
                  </h4>
                  <Badge className="text-xs" variant="secondary">
                    {connection.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {connection.description}
                </p>
              </div>
            </div>
            <div>
              {connection.connected ? (
                <Button
                  onClick={() => handleDisconnect(connection.id)}
                  size="sm"
                  variant="outline"
                >
                  Disconnect
                </Button>
              ) : (
                <Button onClick={() => handleConnect(connection.id)} size="sm">
                  Connect
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
