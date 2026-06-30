import type { GameAccessModeValue } from "@/lib/game-access-mode";

export type TournamentPickOption = {
  inviteCode: string;
  title: string;
};

export type ScoringRuleOption = {
  id: string;
  title: string;
  code: string;
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
  scoringRuleId: string;
  scoringRuleTitle: string;
  penaltyScoringSynthetic: boolean;
  accessMode: GameAccessModeValue;
  isOrganizer: boolean;
  /** Организатор может менять очки и доступ до старта турнира */
  canChangeTournamentSettings: boolean;
  tournamentStarted: boolean;
  participantsCount: number;
  canLeave: boolean;
  canDelete: boolean;
  isActive: boolean;
  canSetAsActive: boolean;
  otherTournaments: TournamentPickOption[];
};
