import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserNotificationKind } from "@/generated/prisma/client";

vi.mock("@/lib/game-organizer-users", () => ({
  getGameOrganizerUserIds: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    gameJoinRequest: {
      findUnique: vi.fn(),
    },
    userNotification: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/telegram/notify", () => ({
  pushTelegramToUsers: vi.fn(),
  pushTelegramToUser: vi.fn(),
}));

import { getGameOrganizerUserIds } from "@/lib/game-organizer-users";
import { prisma } from "@/lib/db";
import {
  notifyJoinRequestApproved,
  notifyJoinRequestRejected,
  notifyOrganizersOfJoinRequest,
  markJoinRequestOrganizerNotificationsRead,
} from "@/lib/notifications";

describe("notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("notifyOrganizersOfJoinRequest создаёт записи организаторам", async () => {
    vi.mocked(getGameOrganizerUserIds).mockResolvedValue(["org-1", "org-2"]);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "org-1",
        notifyInApp: true,
        notifyByTelegram: true,
        telegramChatId: BigInt(1),
      },
      {
        id: "org-2",
        notifyInApp: true,
        notifyByTelegram: false,
        telegramChatId: null,
      },
    ] as never);
    vi.mocked(prisma.userNotification.createMany).mockResolvedValue({ count: 2 });

    await notifyOrganizersOfJoinRequest("game-1", "req-1");

    expect(prisma.userNotification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "org-1",
          kind: UserNotificationKind.JOIN_REQUEST_RECEIVED,
          joinRequestId: "req-1",
        },
        {
          userId: "org-2",
          kind: UserNotificationKind.JOIN_REQUEST_RECEIVED,
          joinRequestId: "req-1",
        },
      ],
    });
  });

  it("не создаёт уведомления без организаторов", async () => {
    vi.mocked(getGameOrganizerUserIds).mockResolvedValue([]);
    await notifyOrganizersOfJoinRequest("game-1", "req-1");
    expect(prisma.userNotification.createMany).not.toHaveBeenCalled();
  });

  it("notifyJoinRequestApproved и Rejected", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      notifyInApp: true,
    } as never);
    vi.mocked(prisma.gameJoinRequest.findUnique).mockResolvedValue({
      game: { title: "Cup" },
    } as never);

    await notifyJoinRequestApproved("u1", "req-1");
    expect(prisma.userNotification.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        kind: UserNotificationKind.JOIN_REQUEST_APPROVED,
        joinRequestId: "req-1",
      },
    });

    await notifyJoinRequestRejected("u1", "req-1");
    expect(prisma.userNotification.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        kind: UserNotificationKind.JOIN_REQUEST_REJECTED,
        joinRequestId: "req-1",
      },
    });
  });

  it("markJoinRequestOrganizerNotificationsRead помечает прочитанными", async () => {
    await markJoinRequestOrganizerNotificationsRead("req-1");
    expect(prisma.userNotification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          joinRequestId: "req-1",
          kind: UserNotificationKind.JOIN_REQUEST_RECEIVED,
        }),
      }),
    );
  });
});
