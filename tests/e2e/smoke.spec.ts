import { test, expect } from "@playwright/test";

test.describe("публичные страницы", () => {
  test("главная открывается", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\//);
  });

  test("страница входа", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /^пароль$/i }),
    ).toBeVisible();
  });

  test("страница регистрации", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("защита маршрутов", () => {
  test("прогнозы без авторизации не отдают контент турнира", async ({ page }) => {
    await page.goto("/game/TESTCODE/predictions");
    await expect(page.getByText(/мои прогнозы/i)).not.toBeVisible();
  });
});
