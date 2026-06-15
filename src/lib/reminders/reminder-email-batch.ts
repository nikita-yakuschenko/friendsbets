import { sendEmail } from "@/lib/email";
import { logOperationError, maskEmail } from "@/lib/logger";
import { shouldNotifyByEmail } from "@/lib/notification-preferences";
import { buildCombinedReminderEmailContent } from "@/lib/prediction-reminder-content";
import type { ReminderEmailSection } from "@/lib/reminders/reminder-email-section";

type UserEmailBucket = {
  email: string;
  userName: string;
  sections: ReminderEmailSection[];
};

function mergeSections(
  sections: ReminderEmailSection[],
  incoming: ReminderEmailSection,
): void {
  const last = sections[sections.length - 1];
  if (
    last &&
    last.type === incoming.type &&
    last.type !== "opening_h24" &&
    last.inviteCode === incoming.inviteCode
  ) {
    if (last.type === "prematch_missing" && incoming.type === "prematch_missing") {
      last.matches.push(...incoming.matches);
      return;
    }
    if (last.type === "match_started" && incoming.type === "match_started") {
      last.matches.push(...incoming.matches);
      return;
    }
    if (last.type === "night_missing" && incoming.type === "night_missing") {
      last.matches.push(...incoming.matches);
      return;
    }
  }
  sections.push(incoming);
}

/** Один e-mail на получателя за прогон cron (или sync). */
export class ReminderEmailBatch {
  private buckets = new Map<string, UserEmailBucket>();

  enqueue(params: {
    userId: string;
    email: string;
    userName: string;
    emailVerifiedAt: Date | null;
    notifyByEmail: boolean;
    section: ReminderEmailSection;
  }): boolean {
    if (
      !shouldNotifyByEmail({
        notifyByEmail: params.notifyByEmail,
        emailVerifiedAt: params.emailVerifiedAt,
      })
    ) {
      return false;
    }

    let bucket = this.buckets.get(params.userId);
    if (!bucket) {
      bucket = {
        email: params.email,
        userName: params.userName,
        sections: [],
      };
      this.buckets.set(params.userId, bucket);
    }

    mergeSections(bucket.sections, params.section);
    return true;
  }

  hasQueued(userId: string): boolean {
    return (this.buckets.get(userId)?.sections.length ?? 0) > 0;
  }

  async flush(): Promise<{ sent: number; errors: number }> {
    const result = { sent: 0, errors: 0 };

    for (const [userId, bucket] of this.buckets) {
      if (bucket.sections.length === 0) continue;

      let content: { subject: string; text: string; html: string };
      try {
        content = buildCombinedReminderEmailContent({
          userName: bucket.userName,
          sections: bucket.sections,
        });
      } catch (error) {
        logOperationError("reminders:email-batch:build", error, { userId });
        result.errors++;
        continue;
      }

      try {
        await sendEmail({
          to: bucket.email,
          subject: content.subject,
          text: content.text,
          html: content.html,
        });
        result.sent++;
      } catch (error) {
        logOperationError("reminders:email-batch:send", error, {
          userId,
          email: maskEmail(bucket.email),
        });
        result.errors++;
      }
    }

    this.buckets.clear();
    return result;
  }
}
