import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAllChatsByUserId } from "@/db/queries/chatv2";
import { auth } from "@/lib/auth";

async function getSessionSafe() {
  try {
    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: (await cookies()).toString(),
      }),
    });
    return session;
  } catch {
    return null;
  }
}

export async function SidebarWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionData = await getSessionSafe();
  const session = sessionData?.session;
  const userId = sessionData?.user?.id ? Number(sessionData.user.id) : null;
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  const chats = userId ? await getAllChatsByUserId({ userId }) : [];

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar chats={chats} user={session} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
