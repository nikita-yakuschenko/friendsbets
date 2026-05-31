import "dotenv/config";
import { syncMatches } from "../src/lib/football-api/sync";

async function main() {
  const result = await syncMatches();
  console.log("Championat sync completed:", result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
