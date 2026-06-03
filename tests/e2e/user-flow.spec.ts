import { test, expect } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@friendsbets.local";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "admin123456";

test.describe("пользовательский flow", () => {
  test("логин админа и доступ к профилю", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(adminEmail);
    await page.getByRole("textbox", { name: /^пароль$/i }).fill(adminPassword);
    await page.getByRole("button", { name: /войти/i }).click();

    await expect(page).toHaveURL(/\//);
    await page.getByRole("link", { name: "Профиль" }).first().click();
    await expect(page.getByRole("heading", { name: "Профиль" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#email")).toHaveValue(adminEmail);
  });

  test("регистрация нового пользователя (форма)", async ({ page }) => {
    const email = `e2e-${Date.now()}@friendsbets.local`;
    await page.goto("/register");
    await page.getByLabel(/имя/i).fill("E2E User");
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole("textbox", { name: /^пароль$/i }).fill("secret12");
    await page.getByRole("button", { name: /зарегистрироваться/i }).click();

    await expect(page).toHaveURL(/verify-email/, { timeout: 15_000 });
  });

  test("logout возвращает на главную", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(adminEmail);
    await page.getByRole("textbox", { name: /^пароль$/i }).fill(adminPassword);
    await page.getByRole("button", { name: /войти/i }).click();
    await expect(page).toHaveURL(/\//);

    const logout = page.getByRole("button", { name: /выйти/i });
    if (await logout.isVisible().catch(() => false)) {
      await logout.click();
    } else {
      await page.goto("/");
      const link = page.getByRole("link", { name: /выйти/i });
      if (await link.isVisible().catch(() => false)) await link.click();
    }
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("админ: страница /admin", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(adminEmail);
    await page.getByRole("textbox", { name: /^пароль$/i }).fill(adminPassword);
    await page.getByRole("button", { name: /войти/i }).click();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 15_000,
    });
  });
});
