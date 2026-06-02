import type { PlatformRole } from "@/components/user/user-role-badge";

export type AdminUserGameRef = {
  id: string;
  title: string;
  inviteCode: string;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  platformRole: PlatformRole;
  createdAt: string;
  organizerGames: AdminUserGameRef[];
  participantGames: AdminUserGameRef[];
};
