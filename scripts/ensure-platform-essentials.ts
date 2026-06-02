import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { bootPlatformEssentials } from "../src/lib/platform-essentials";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[essentials] DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

bootPlatformEssentials(prisma)
  .catch((error) => {
    console.error("[essentials] FAILED:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
