-- Admin digest emails for missing predictions
ALTER TYPE "PredictionReminderKind" ADD VALUE 'H3_ADMIN';
ALTER TYPE "PredictionReminderKind" ADD VALUE 'H1_ADMIN';
ALTER TYPE "PredictionReminderKind" ADD VALUE 'M15_ADMIN';
