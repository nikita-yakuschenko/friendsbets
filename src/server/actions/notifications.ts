"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/server/actions/auth";

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const session = await requireAuth();

  await prisma.userNotification.updateMany({
    where: { userId: session.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
  revalidatePath("/notifications");

  return { success: true };
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResult> {
  const session = await requireAuth();

  await prisma.userNotification.updateMany({
    where: { id: notificationId, userId: session.id },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
  revalidatePath("/notifications");

  return { success: true };
}
