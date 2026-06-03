-- CreateIndex
CREATE INDEX "Match_tournamentId_status_startsAt_idx" ON "Match"("tournamentId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "Match_tournamentId_championatTrackActive_idx" ON "Match"("tournamentId", "championatTrackActive");

-- CreateIndex
CREATE INDEX "Match_externalId_idx" ON "Match"("externalId");

-- CreateIndex
CREATE INDEX "Prediction_gameId_matchId_idx" ON "Prediction"("gameId", "matchId");

-- CreateIndex
CREATE INDEX "PredictionReminder_gameId_matchId_idx" ON "PredictionReminder"("gameId", "matchId");

-- CreateIndex
CREATE INDEX "PredictionReminder_gameId_matchId_kind_idx" ON "PredictionReminder"("gameId", "matchId", "kind");
