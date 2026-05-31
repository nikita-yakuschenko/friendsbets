-- Game-level participant roles (organizer = tournament admin)
CREATE TYPE "GameParticipantRole" AS ENUM ('PARTICIPANT', 'ORGANIZER');

ALTER TABLE "GameParticipant" ADD COLUMN "role" "GameParticipantRole" NOT NULL DEFAULT 'PARTICIPANT';

UPDATE "GameParticipant" gp
SET "role" = 'ORGANIZER'
FROM "Game" g
WHERE gp."gameId" = g.id AND gp."userId" = g."createdById";
