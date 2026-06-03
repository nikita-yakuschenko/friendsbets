import Link from "next/link";
import { notFound } from "next/navigation";
import { NotificationList } from "@/components/notifications/notification-list";
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
      />
      <NotificationList items={items} />
      <p className="mt-6 text-center text-sm">
        <Link
          href={gamePath(routeParam, "more")}
          className="text-brand-muted hover:text-white"
        >
          ← Назад в «Ещё»
        </Link>
      </p>
    </ContentContainer>
  );
}
