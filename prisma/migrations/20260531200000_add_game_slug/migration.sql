-- Backfill slug from invite code for existing games
ALTER TABLE "Game" ADD COLUMN "slug" TEXT;

UPDATE "Game" SET "slug" = "inviteCode" WHERE "slug" IS NULL;

ALTER TABLE "Game" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");
CREATE INDEX "Game_slug_idx" ON "Game"("slug");
