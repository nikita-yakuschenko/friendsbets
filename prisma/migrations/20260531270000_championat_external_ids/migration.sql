-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN "externalId" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_externalId_key" ON "Tournament"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_externalId_key" ON "Team"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_tournamentId_externalId_key" ON "Match"("tournamentId", "externalId");
