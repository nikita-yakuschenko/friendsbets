export type ReminderEmailMatchBlock = {
  homeTeam: string;
  awayTeam: string;
  startsAt?: Date;
  timeLabel?: string;
  predictedHome?: number | null;
  predictedAway?: number | null;
};

export type ReminderEmailSection =
  | {
      type: "prematch_missing";
      gameTitle: string;
      inviteCode: string;
      matches: ReminderEmailMatchBlock[];
    }
  | {
      type: "match_started";
      gameTitle: string;
      inviteCode: string;
      matches: ReminderEmailMatchBlock[];
    }
  | {
      type: "night_missing";
      gameTitle: string;
      inviteCode: string;
      matches: Array<{
        homeTeam: { name: string; countryCode: string | null };
        awayTeam: { name: string; countryCode: string | null };
        startsAt: Date;
      }>;
    }
  | {
      type: "opening_h24";
      gameTitle: string;
      inviteCode: string;
      homeTeam: { name: string; countryCode: string | null };
      awayTeam: { name: string; countryCode: string | null };
      startsAt: Date;
      hasPrediction: boolean;
    };
