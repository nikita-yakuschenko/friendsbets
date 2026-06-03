export type AdminMatchRow = {
  id: string;
  status: string;
  startsAt: string;
  homeScore: number | null;
  awayScore: number | null;
  stage: string | null;
  homeTeamName: string;
  awayTeamName: string;
  templateTitle: string;
  templateId: string | null;
  tournamentId: string;
  linkedGamesCount: number;
};
