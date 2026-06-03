import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getAdminEmail, getAdminPassword } from "../src/lib/admin-credentials";
import { bootstrapEssentialData } from "../prisma/seed-data";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[admin:sync] DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const adminEmail = getAdminEmail();
    const adminPassword = getAdminPassword();
    const adminHash = await bcrypt.hash(adminPassword, 12);

    await bootstrapEssentialData(prisma, adminEmail, adminHash);

    console.log("[admin:sync] Пароль суперадмина обновлён из .env");
    console.log(`[admin:sync] ${adminEmail} (пароль не выводим в лог)`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
