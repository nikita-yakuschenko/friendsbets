import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  bootstrapEssentialData,
  cleanupMockData,
  SEED_GAME_SLUG,
} from "./seed-data";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@friendsbets.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123456";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await cleanupMockData(prisma);
  await bootstrapEssentialData(prisma, adminEmail, adminHash);

  console.log("Seed completed.");
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`Game invite code: ${SEED_GAME_SLUG}`);
  console.log(`Game URL: /game/${SEED_GAME_SLUG}`);
  console.log("Matches: npm run sync:championat");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
