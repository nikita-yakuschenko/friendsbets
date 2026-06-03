import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function parsePoolInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getDatabasePoolConfig(connectionString: string): PoolConfig {
  return {
    connectionString,
    max: parsePoolInt(process.env.DATABASE_POOL_MAX, 10),
    idleTimeoutMillis: parsePoolInt(
      process.env.DATABASE_POOL_IDLE_TIMEOUT_MS,
      30_000,
    ),
    connectionTimeoutMillis: parsePoolInt(
      process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS,
      10_000,
    ),
  };
}

function createPool(connectionString: string): Pool {
  return new Pool(getDatabasePoolConfig(connectionString));
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = globalForPrisma.pool ?? createPool(connectionString);
  const adapter = new PrismaPg(pool);

  if (!globalForPrisma.pool) {
    globalForPrisma.pool = pool;
  }

  return new PrismaClient({ adapter });
}

function isPrismaClientCurrent(client: PrismaClient): boolean {
  return typeof (client as PrismaClient & { tournamentTemplate?: unknown })
    .tournamentTemplate !== "undefined";
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isPrismaClientCurrent(cached)) {
    return cached;
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

/** Ленивый клиент — не требует DATABASE_URL при импорте (нужно для next build). */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, prop, client);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
