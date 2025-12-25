import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth";

export async function SidebarWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = await getSession();
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={session} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
