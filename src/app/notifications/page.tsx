import { redirect } from "next/navigation";
import { NotificationList } from "@/components/notifications/notification-list";
import { AppShell } from "@/components/layout/app-shell";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth";
import { listUserNotifications } from "@/lib/notifications";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const items = await listUserNotifications(session.id);

  return (
    <AppShell user={session}>
      <ContentContainer>
        <PageHeader
          title="Уведомления"
          description="Заявки на вступление, ответы организаторов и сообщения платформы."
        />
        <NotificationList items={items} />
      </ContentContainer>
    </AppShell>
  );
}
