import { computeAdaptiveReminderPollDelayMs } from "@/lib/reminders/adaptive-poll-delay";
import { getNearestReminderFireAt } from "@/lib/reminders/nearest-reminder-fire-at";
import { logOperation, logOperationError } from "@/lib/logger";

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let started = false;

async function runReminderTick(): Promise<void> {
  if (running) return;
  running = true;
  const startedAt = Date.now();
  try {
    const { sendDuePredictionReminders } = await import(
      "@/lib/reminders/prediction-reminders"
    );
    const result = await sendDuePredictionReminders();
    logOperation("reminders:background", {
      durationMs: Date.now() - startedAt,
      ...result,
    });
  } catch (error) {
    logOperationError("reminders:background", error);
  } finally {
    running = false;
  }
}

async function scheduleNext(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  const now = new Date();
  let nextFireAt: Date | null = null;
  try {
    nextFireAt = await getNearestReminderFireAt(now);
  } catch (error) {
    logOperationError("reminders:background:schedule", error);
  }

  const delay = computeAdaptiveReminderPollDelayMs(now, nextFireAt);
  timer = setTimeout(() => {
    void (async () => {
      await runReminderTick();
      await scheduleNext();
    })();
  }, delay);
}

/** Фоновый мониторинг напоминаний (дополняет HTTP cron). */
export function startBackgroundReminderScheduler(): void {
  if (started) return;
  if (process.env.BACKGROUND_REMINDERS === "false") return;

  started = true;
  logOperation("reminders:background:start", {});

  void (async () => {
    await runReminderTick();
    await scheduleNext();
  })();
}
