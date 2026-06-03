export type TournamentPickOption = {
  inviteCode: string;
  title: string;
};

export type MyTournamentRow = {
  id: string;
  title: string;
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
