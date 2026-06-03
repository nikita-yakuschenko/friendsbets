-- AlterTable
ALTER TABLE "Match" ADD COLUMN "championatTrackActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Match" ADD COLUMN "championatLastSyncAt" TIMESTAMP(3);
