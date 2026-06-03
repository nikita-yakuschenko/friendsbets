import { test, expect } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@friendsbets.local";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "admin123456";
const gameInvite = process.env.E2E_GAME_INVITE_CODE;

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(adminEmail);
  await page.getByRole("textbox", { name: /^пароль$/i }).fill(adminPassword);
  await page.getByRole("button", { name: /войти/i }).click();
  await expect(page).toHaveURL(/\//, { timeout: 15_000 });
}

test.describe("сквозной турнирный flow", () => {
  test("админ: главная → прогнозы (если есть турнир)", async ({ page }) => {
    test.skip(!gameInvite, "Задайте E2E_GAME_INVITE_CODE в .env.test.local");

    await loginAsAdmin(page);
    await page.goto(`/game/${gameInvite}/predictions`);

    await expect(
      page.getByRole("heading", { name: /прогноз/i }).or(page.getByText(/мои прогнозы/i)),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("админ: таблица лидеров открывается", async ({ page }) => {
    test.skip(!gameInvite, "Задайте E2E_GAME_INVITE_CODE");

    await loginAsAdmin(page);
    await page.goto(`/game/${gameInvite}/leaderboard`);

    await expect(page.getByText(/таблица|лидер|очк/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
