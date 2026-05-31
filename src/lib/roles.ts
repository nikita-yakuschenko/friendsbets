import { UserRole } from "@/generated/prisma/client";

/** Роли пользователей в приложении. */
export const USER_ROLES = {
  ADMIN: UserRole.ADMIN,
  PARTICIPANT: UserRole.PARTICIPANT,
} as const;

/** Человекочитаемые названия ролей. */
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Администратор",
  [UserRole.PARTICIPANT]: "Участник",
};

export type RolePermission = "adminPanel" | "gamePlay";

/** Права доступа по ролям. */
export const ROLE_PERMISSIONS: Record<RolePermission, readonly UserRole[]> = {
  /** Админ-панель, результаты матчей, пересчёт очков, «Кто не поставил». */
  adminPanel: [UserRole.ADMIN],
  /** Прогнозы, таблица, Live. */
  gamePlay: [UserRole.ADMIN, UserRole.PARTICIPANT],
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

export function isParticipant(role: UserRole): boolean {
  return role === UserRole.PARTICIPANT;
}

export function hasPermission(role: UserRole, permission: RolePermission): boolean {
  return ROLE_PERMISSIONS[permission].includes(role);
}
