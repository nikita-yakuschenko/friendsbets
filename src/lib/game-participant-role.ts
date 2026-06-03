/** Роли участника турнира — без импорта Prisma в клиент. */

export const GAME_PARTICIPANT_ROLE = {
  ORGANIZER: "ORGANIZER",
  PARTICIPANT: "PARTICIPANT",
} as const;

export type GameParticipantRoleValue =
  (typeof GAME_PARTICIPANT_ROLE)[keyof typeof GAME_PARTICIPANT_ROLE];
