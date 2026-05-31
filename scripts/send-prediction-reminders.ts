import "dotenv/config";
import { sendDuePredictionReminders } from "../src/lib/reminders/prediction-reminders";

async function main() {
  const result = await sendDuePredictionReminders();
  console.log("Prediction reminders:", result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
