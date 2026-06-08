import {
  UserNotificationKind,
  type Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { withNotificationSignoff } from "@/lib/notification-signoff";

type CreateUserNotificationData = {
  userId: string;
  kind: UserNotificationKind;
  title?: string | null;
  body?: string | null;
  actionInviteCode?: string | null;
  joinRequestId?: string | null;
};

export async function createUserNotification(data: CreateUserNotificationData) {
  return prisma.userNotification.create({
    data: {
      ...data,
      body:
        data.body != null && data.body !== ""
          ? withNotificationSignoff(data.body)
          : data.body,
    },
  });
}

export function mapUserNotificationsWithSignoff(
  rows: CreateUserNotificationData[],
): Prisma.UserNotificationCreateManyInput[] {
  return rows.map((row) => ({
    ...row,
    body:
      row.body != null && row.body !== ""
        ? withNotificationSignoff(row.body)
        : row.body,
  }));
}
