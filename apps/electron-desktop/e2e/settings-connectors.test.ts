import { test, expect, type Page } from "@playwright/test";
import {
  type AppContext,
  launchApp,
  closeApp,
  finishOnboarding,
  navigateToMessengersTab,
  getTestCredentials,
} from "./helpers";

const creds = getTestCredentials();

test.describe("Settings — connector modals (Messengers tab)", () => {
  test.describe.configure({ mode: "serial" });

  let ctx: AppContext;
  let page: Page;

  test.skip(!creds, "No API key — create e2e/e2e.config.json (see e2e.config.example.json)");

  test.beforeAll(async () => {
    ctx = await launchApp();
    page = ctx.page;
  });

  test.afterAll(async () => {
    if (ctx) await closeApp(ctx);
  });

  test("complete onboarding and open messengers tab", async () => {
    test.setTimeout(120_000);
    await finishOnboarding(page, creds!);
    await navigateToMessengersTab(page);
  });

  // ── Telegram ────────────────────────────────────────────

  test("Telegram card is visible with Connect button", async () => {
    const card = page.locator('[role="group"][aria-label="Telegram"]');
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: /Connect|Edit/ })).toBeVisible();
  });

  test("click Connect on Telegram opens modal", async () => {
    const card = page.locator('[role="group"][aria-label="Telegram"]');
    await card.getByRole("button", { name: /Connect|Edit/ }).click();

    const modal = page.getByRole("dialog", { name: "Telegram settings" });
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test("Telegram modal shows bot token input", async () => {
    const modal = page.getByRole("dialog", { name: "Telegram settings" });
    const tokenInput = modal.locator('input[type="password"]').first();
    await expect(tokenInput).toBeVisible();
  });

  test("Telegram modal has Connect button", async () => {
    const modal = page.getByRole("dialog", { name: "Telegram settings" });
    await expect(modal.getByRole("button", { name: /Connect|Update/ })).toBeVisible();
  });

  test("close Telegram modal via Close button", async () => {
    await page.getByRole("button", { name: "Close" }).click();
    const modal = page.getByRole("dialog", { name: "Telegram settings" });
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Slack ───────────────────────────────────────────────

  test("Slack card is visible with Connect button", async () => {
    const card = page.locator('[role="group"][aria-label="Slack"]');
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: /Connect|Edit/ })).toBeVisible();
  });

  test("click Connect on Slack opens modal", async () => {
    const card = page.locator('[role="group"][aria-label="Slack"]');
    await card.getByRole("button", { name: /Connect|Edit/ }).click();

    const modal = page.getByRole("dialog", { name: "Slack settings" });
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test("Slack modal shows Bot token and App token inputs", async () => {
    const modal = page.getByRole("dialog", { name: "Slack settings" });
    const inputs = modal.locator('input[type="password"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("Slack modal shows channel policy buttons", async () => {
    const modal = page.getByRole("dialog", { name: "Slack settings" });
    await expect(modal.getByRole("button", { name: "allowlist" }).first()).toBeVisible();
  });

  test("close Slack modal via Close button", async () => {
    await page.getByRole("button", { name: "Close" }).click();
    const modal = page.getByRole("dialog", { name: "Slack settings" });
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });
});
