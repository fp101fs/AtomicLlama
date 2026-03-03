import { test, expect, type Page } from "@playwright/test";
import {
  type AppContext,
  launchApp,
  closeApp,
  finishOnboarding,
  navigateToSkillsTab,
  getTestCredentials,
} from "./helpers";

const creds = getTestCredentials();
const isMac = process.platform === "darwin";

test.describe("Settings — skill modals (Skills tab)", () => {
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

  test("complete onboarding and open skills tab", async () => {
    test.setTimeout(120_000);
    await finishOnboarding(page, creds!);
    await navigateToSkillsTab(page);
  });

  test("search field is visible", async () => {
    await expect(page.getByPlaceholder("Search by skills…")).toBeVisible();
  });

  // ── Notion ──────────────────────────────────────────────

  test("Notion card visible and opens modal with API key input", async () => {
    const card = page.locator('[role="group"][aria-label="Notion"]');
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /Connect|Edit/ }).click();

    const modal = page.getByRole("dialog", { name: "Notion settings" });
    await expect(modal).toBeVisible({ timeout: 5_000 });

    const input = modal.locator('input[type="password"]').first();
    await expect(input).toBeVisible();

    await expect(modal.getByRole("button", { name: /Connect|Update/ })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  // ── GitHub ──────────────────────────────────────────────

  test("GitHub card visible and opens modal with PAT input", async () => {
    const card = page.locator('[role="group"][aria-label="GitHub"]');
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /Connect|Edit/ }).click();

    const modal = page.getByRole("dialog", { name: "GitHub settings" });
    await expect(modal).toBeVisible({ timeout: 5_000 });

    const input = modal.locator('input[type="password"]').first();
    await expect(input).toBeVisible();

    await expect(modal.getByRole("button", { name: /Connect|Re-authenticate/ })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Trello ──────────────────────────────────────────────

  test("Trello card visible and opens modal with API key and token inputs", async () => {
    const card = page.locator('[role="group"][aria-label="Trello"]');
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /Connect|Edit/ }).click();

    const modal = page.getByRole("dialog", { name: "Trello settings" });
    await expect(modal).toBeVisible({ timeout: 5_000 });

    const inputs = modal.locator('input[type="password"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await expect(modal.getByRole("button", { name: /Connect|Update/ })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Google Workspace ────────────────────────────────────

  test("Google Workspace card visible and opens modal with email input", async () => {
    const card = page.locator('[role="group"][aria-label="Google Workspace"]');
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /Connect|Edit/ }).click();

    const modal = page.getByRole("dialog", { name: "Google Workspace settings" });
    await expect(modal).toBeVisible({ timeout: 5_000 });

    const input = modal.locator('input[type="text"]').first();
    await expect(input).toBeVisible();

    await expect(modal.getByRole("button", { name: "Connect" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Obsidian ────────────────────────────────────────────

  test("Obsidian card visible and opens modal", async () => {
    const card = page.locator('[role="group"][aria-label="Obsidian"]');
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /Connect|Edit/ }).click();

    const modal = page.getByRole("dialog", { name: "Obsidian settings" });
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // May show vault select, "Loading vaults...", or "No vaults found"
    const hasContent =
      (await modal
        .getByText("Loading vaults")
        .isVisible()
        .catch(() => false)) ||
      (await modal
        .getByText("No Obsidian vaults found")
        .isVisible()
        .catch(() => false)) ||
      (await modal
        .getByText("No vaults found")
        .isVisible()
        .catch(() => false)) ||
      (await modal
        .locator("select")
        .isVisible()
        .catch(() => false));
    expect(hasContent).toBe(true);

    await page.getByRole("button", { name: "Close" }).click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Apple Notes (macOS only) ────────────────────────────

  test("Apple Notes card visible and opens modal with Enable button", async () => {
    test.skip(!isMac, "Apple Notes is macOS only");

    const card = page.locator('[role="group"][aria-label="Apple Notes"]');
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /Connect|Edit/ }).click();

    const modal = page.getByRole("dialog", { name: "Apple Notes settings" });
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await expect(modal.getByRole("button", { name: /Enable Apple Notes|Re-enable/ })).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  // ── Apple Reminders (macOS only) ────────────────────────

  test("Apple Reminders card visible and opens modal with Enable button", async () => {
    test.skip(!isMac, "Apple Reminders is macOS only");

    const card = page.locator('[role="group"][aria-label="Apple Reminders"]');
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /Connect|Edit/ }).click();

    const modal = page.getByRole("dialog", { name: "Apple Reminders settings" });
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await expect(
      modal.getByRole("button", { name: /Enable Apple Reminders|Re-enable/ })
    ).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });
});
