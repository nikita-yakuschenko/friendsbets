export type AdminTournamentRow = {
  id: string;
  title: string;
  status: string;
  externalId: string | null;
};

export type AdminTemplateRow = {
  id: string;
  title: string;
  description: string | null;
  isSystem: boolean;
  matchCount: number | null;
};
