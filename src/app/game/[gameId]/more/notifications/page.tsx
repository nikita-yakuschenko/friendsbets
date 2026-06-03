import { notFound } from "next/navigation";
import { NotificationList } from "@/components/notifications/notification-list";
import { PageBackButton } from "@/components/layout/page-back-button";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth";
import { gamePath } from "@/lib/game-path";
import { resolveGameIdFromRoute } from "@/lib/game-access";
import { prisma } from "@/lib/db";
import { listUserNotifications } from "@/lib/notifications";

export default async function GameNotificationsPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId: routeParam } = await params;
  const internalId = await resolveGameIdFromRoute(routeParam);
  if (!internalId) return notFound();

  await prisma.userNotification.updateMany({
    where: { userId: session.id, readAt: null },
    data: { readAt: new Date() },
  });

  const items = await listUserNotifications(session.id);

  return (
    <ContentContainer>
      <PageHeader
        title="Уведомления"
        description="Заявки на вступление и ответы организаторов."
        action={
          <PageBackButton fallbackHref={gamePath(routeParam, "more")} />
        }
      />
      <NotificationList items={items} />
    </ContentContainer>
  );
}
