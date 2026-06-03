export type TournamentPickOption = {
  inviteCode: string;
  title: string;
};

export type MyTournamentRow = {
  id: string;
  title: string;
  /** Шаблон или турнир Championat, если отличается от своего названия игры */
  sourceLabel: string | null;
  organizerLabel: "Организатор" | "Организаторы";
  organizerNames: string;
  inviteCode: string;
  inviteLinkUrl: string;
  createdAt: string;
  scoringRuleTitle: string;
  participantsCount: number;
  canLeave: boolean;
  canDelete: boolean;
  isActive: boolean;
  canSetAsActive: boolean;
  otherTournaments: TournamentPickOption[];
};
