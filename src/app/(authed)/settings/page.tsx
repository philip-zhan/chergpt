import {
  AccountSettingsCards,
  ApiKeysCard,
  DeleteAccountCard,
  OrganizationsCard,
  SecuritySettingsCards,
} from "@daveyplate/better-auth-ui";
import type { Metadata } from "next";
import { ConnectionsCard } from "@/components/connections/connections-card-server";
import {
  HashTabs,
  HashTabsContent,
  HashTabsList,
  HashTabsTrigger,
} from "@/components/ui/hash-tabs";

export const metadata: Metadata = {
  title: "Settings",
};

export default function AccountPage() {
  return (
    <div className="p-6">
      <HashTabs className="space-y-4" defaultValue="settings">
        <HashTabsList className="grid grid-cols-4">
          <HashTabsTrigger value="account">Account</HashTabsTrigger>
          <HashTabsTrigger value="security">Security</HashTabsTrigger>
          <HashTabsTrigger value="organizations">Organizations</HashTabsTrigger>
          <HashTabsTrigger value="connections">Connections</HashTabsTrigger>
        </HashTabsList>
        <HashTabsContent className="space-y-4" value="account">
          <AccountSettingsCards />
          <DeleteAccountCard />
        </HashTabsContent>
        <HashTabsContent className="space-y-4" value="security">
          <SecuritySettingsCards />
          <ApiKeysCard />
        </HashTabsContent>
        <HashTabsContent value="organizations">
          <OrganizationsCard />
        </HashTabsContent>
        <HashTabsContent className="space-y-4" value="connections">
          <ConnectionsCard />
        </HashTabsContent>
      </HashTabs>
    </div>
  );
}
