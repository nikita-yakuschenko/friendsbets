import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

export function getTestDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
}

export function createTestPrisma(): PrismaClient {
  const url = getTestDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL_TEST or DATABASE_URL is required");
  }
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
