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
  title: "Settings",
};

export default function AccountPage() {
  return (
    <div className="p-4">
      <HashTabs defaultValue="settings">
        <HashTabsList>
          <HashTabsTrigger value="account">Account</HashTabsTrigger>
          <HashTabsTrigger value="security">Security</HashTabsTrigger>
          <HashTabsTrigger value="organizations">Organizations</HashTabsTrigger>
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
      </HashTabs>
    </div>
  );
}
