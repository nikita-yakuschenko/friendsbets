import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { parseChampionatTournamentUrl } from "../src/lib/championat-url";
import { SYSTEM_TEMPLATE_WC_2026 } from "../src/lib/tournament-template-presets";
import { ensureChampionatTournament } from "../src/lib/tournament-setup";
import { getAdminEmail, getAdminPassword } from "../src/lib/admin-credentials";
import { bootstrapEssentialData, removeLegacyDemoData } from "./seed-data";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = getAdminEmail();
  const adminPassword = getAdminPassword();
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await removeLegacyDemoData(prisma);
  await bootstrapEssentialData(prisma, adminEmail, adminHash);

  const parsed = parseChampionatTournamentUrl(SYSTEM_TEMPLATE_WC_2026.championatUrl);
  if (parsed && process.env.SKIP_CHAMPIONAT_SEED !== "1") {
    console.log("Загрузка данных системного шаблона ЧМ-2026 с Championat…");
    const { matchCount } = await ensureChampionatTournament(parsed);
    console.log(`Шаблон ЧМ-2026: ${matchCount} матчей в базе.`);
  }

  console.log("Seed completed.");
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log("Создайте турнир: /create → по шаблону (без повторной загрузки).");
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
