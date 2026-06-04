import { notFound } from "next/navigation";
import {
  IconBell,
  IconShield,
  IconSoccerField,
  IconUser,
} from "@tabler/icons-react";
import { GameMoreMenu, type GameMoreMenuItem } from "@/components/game/game-more-menu";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { canManageGame, resolveGameIdFromRoute } from "@/lib/game-access";
import { getSession } from "@/lib/auth";
import { countUnreadNotifications } from "@/lib/notifications";
import { gamePath } from "@/lib/game-path";
import { isSuperadmin } from "@/lib/roles";

export default async function GameMorePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const { gameId: routeParam } = await params;
  const internalId = await resolveGameIdFromRoute(routeParam);
  if (!internalId) return notFound();

  const canManage = await canManageGame(session, internalId);
  const isPlatformAdmin = isSuperadmin(session.role);
  const unreadNotifications = await countUnreadNotifications(session.id);

  const items: GameMoreMenuItem[] = [
    {
      href: "/notifications",
      label: "Уведомления",
      icon: IconBell,
      badgeCount: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    {
      href: "/profile",
      label: "Профиль",
      icon: IconUser,
    },
    {
      href: "/",
      label: "Мои турниры",
      icon: IconSoccerField,
    },
  ];

  if (isPlatformAdmin) {
    items.push({
      href: "/admin",
      label: "Платформа",
      icon: IconShield,
    });
  } else if (canManage) {
    items.push({
      href: "/admin",
      label: "Мой турнир",
      icon: IconShield,
    });
  }

  return (
    <ContentContainer>
      <PageHeader title="Ещё" />
      <GameMoreMenu items={items} />
    </ContentContainer>
  );
}
