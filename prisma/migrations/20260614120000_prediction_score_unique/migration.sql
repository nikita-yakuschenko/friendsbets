-- Удаляем дубли: оставляем запись с самым поздним calculatedAt (при равенстве — больший id).
DELETE FROM "PredictionScore" AS older
USING "PredictionScore" AS newer
WHERE older."predictionId" = newer."predictionId"
  AND (
    older."calculatedAt" < newer."calculatedAt"
    OR (
      older."calculatedAt" = newer."calculatedAt"
      AND older.id < newer.id
    )
  );

CREATE UNIQUE INDEX "PredictionScore_predictionId_key" ON "PredictionScore"("predictionId");
