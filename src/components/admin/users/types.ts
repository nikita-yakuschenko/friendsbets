import type { PlatformRole } from "@/components/user/user-role-badge";

export type AdminUserGameRef = {
  id: string;
  title: string;
  inviteCode: string;
};

export type AdminGameOption = {
  id: string;
  title: string;
  inviteCode: string;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  updatedAt: string;
  platformRole: PlatformRole;
  createdAt: string;
  organizerGames: AdminUserGameRef[];
  participantGames: AdminUserGameRef[];
  telegramLinked: boolean;
  telegramUsername: string | null;
};
