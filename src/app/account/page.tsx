import {
  AccountSettingsCards,
  ApiKeysCard,
  DeleteAccountCard,
  OrganizationsCard,
  SecuritySettingsCards,
} from "@daveyplate/better-auth-ui";
import type { Metadata } from "next";
import {
  HashTabs,
  HashTabsContent,
  HashTabsList,
  HashTabsTrigger,
} from "@/components/ui/hash-tabs";

export const metadata: Metadata = {
  title: "Account Settings",
};

export default function AccountPage() {
  return (
    <div className="p-4">
      <HashTabs defaultValue="settings">
        <HashTabsList>
          <HashTabsTrigger value="settings">Settings</HashTabsTrigger>
          <HashTabsTrigger value="security">Security</HashTabsTrigger>
          <HashTabsTrigger value="api">API Keys</HashTabsTrigger>
          <HashTabsTrigger value="organizations">Organizations</HashTabsTrigger>
        </HashTabsList>
        <HashTabsContent className="space-y-4" value="settings">
          <AccountSettingsCards />
          <DeleteAccountCard />
        </HashTabsContent>
        <HashTabsContent value="security">
          <SecuritySettingsCards />
        </HashTabsContent>
        <HashTabsContent value="api">
          <ApiKeysCard />
        </HashTabsContent>
        <HashTabsContent value="organizations">
          <OrganizationsCard />
        </HashTabsContent>
      </HashTabs>
    </div>
  );
}
