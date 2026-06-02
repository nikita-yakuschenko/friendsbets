import { GameParticipantRole, UserRole } from "@/generated/prisma/client";

/** Значения `User.role` для клиентских компонентов без импорта Prisma. */
export type PlatformRole = "ADMIN" | "PARTICIPANT";

/**
 * Роли уровня платформы (таблица User).
 * ADMIN = суперадмин сервиса (один аккаунт из ADMIN_EMAIL при seed).
 * PARTICIPANT = обычный пользователь.
 *
 * «Админ турнира» — это GameParticipantRole.ORGANIZER, не User.role.
 */
export const USER_ROLES = {
  SUPERADMIN: UserRole.ADMIN,
  PARTICIPANT: UserRole.PARTICIPANT,
} as const;

export const PLATFORM_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Суперадмин",
  [UserRole.PARTICIPANT]: "Участник",
};

export const GAME_PARTICIPANT_ROLE_LABELS: Record<GameParticipantRole, string> = {
  [GameParticipantRole.ORGANIZER]: "Организатор турнира",
  [GameParticipantRole.PARTICIPANT]: "Участник",
};

export type RolePermission = "platformAdmin" | "gamePlay";

/** Права доступа по ролям платформы. */
export const ROLE_PERMISSIONS: Record<RolePermission, readonly UserRole[]> = {
  /** Глобальная админка, все турниры, интеграции, пользователи (когда добавим). */
  platformAdmin: [UserRole.ADMIN],
  /** Прогнозы, таблица, Live — любой авторизованный пользователь. */
  gamePlay: [UserRole.ADMIN, UserRole.PARTICIPANT],
};

export function getPlatformRoleLabel(role: UserRole | PlatformRole): string {
  return PLATFORM_ROLE_LABELS[role as UserRole] ?? role;
}

export function getGameParticipantRoleLabel(role: GameParticipantRole): string {
  return GAME_PARTICIPANT_ROLE_LABELS[role] ?? role;
}

/** Суперадмин платформы (создатель сервиса). */
export function isSuperadmin(role: UserRole | PlatformRole): boolean {
  return role === UserRole.ADMIN;
}

/** @deprecated Используйте isSuperadmin — «admin» в коде означал платформу, не организатора турнира. */
export const isAdmin = isSuperadmin;

export function isPlatformParticipant(role: UserRole): boolean {
  return role === UserRole.PARTICIPANT;
}

export function isGameOrganizerRole(role: GameParticipantRole): boolean {
  return role === GameParticipantRole.ORGANIZER;
}

export function hasPermission(role: UserRole, permission: RolePermission): boolean {
  return ROLE_PERMISSIONS[permission].includes(role);
}

/** @deprecated Используйте hasPermission(role, "platformAdmin") */
export function hasAdminPanelAccess(role: UserRole): boolean {
  return hasPermission(role, "platformAdmin");
}
