import { cookies } from "next/headers";
import { AppSidebar } from "@/components/root/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAllChatsByUserId } from "@/db/queries/chatv2";
import { getUserId } from "@/lib/auth";

export async function SidebarWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  const userId = await getUserId();
  const chats = await getAllChatsByUserId({ userId });

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar chats={chats} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
