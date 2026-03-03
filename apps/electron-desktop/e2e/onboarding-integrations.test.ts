import { test, expect, type Page } from "@playwright/test";
import {
  type AppContext,
  launchApp,
  closeApp,
  acceptConsent,
  waitForProviderSelect,
  selectProvider,
  enterApiKey,
  waitForModelSelect,
  selectFirstModel,
  waitForSkillsPage,
  getTestCredentials,
} from "./helpers";

const creds = getTestCredentials();
const isMac = process.platform === "darwin";

test.describe("Onboarding — integration connect pages (Skills step)", () => {
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

  test("navigate through onboarding to skills page", async () => {
    test.setTimeout(120_000);
    await acceptConsent(page);
    await waitForProviderSelect(page);
    await selectProvider(page, creds!.provider);
    await enterApiKey(page, creds!.key);
    await waitForModelSelect(page);
    await selectFirstModel(page);
    await waitForSkillsPage(page);
  });

  // ── Notion ──────────────────────────────────────────────

  test("click Connect on Notion opens Notion setup page", async () => {
    const card = page.locator('[role="group"][aria-label="Notion"]');
    await expect(card).toBeVisible();
    await card.getByText("Connect").click();

    const setupPage = page.locator('[aria-label="Notion setup"]');
    await expect(setupPage).toBeVisible({ timeout: 5_000 });

    const input = setupPage.locator("input").first();
    await expect(input).toBeVisible();
  });

  test("back from Notion returns to skills page", async () => {
    const setupPage = page.locator('[aria-label="Notion setup"]');
    await setupPage.getByRole("button", { name: "Back" }).click();
    await expect(page.locator('[aria-label="Skills setup"]')).toBeVisible({ timeout: 5_000 });
  });

  // ── GitHub ──────────────────────────────────────────────

  test("click Connect on GitHub opens GitHub setup page", async () => {
    const card = page.locator('[role="group"][aria-label="GitHub"]');
    await expect(card).toBeVisible();
    await card.getByText("Connect").click();

    const setupPage = page.locator('[aria-label="GitHub setup"]');
    await expect(setupPage).toBeVisible({ timeout: 5_000 });

    const input = setupPage.locator("input").first();
    await expect(input).toBeVisible();
  });

  test("back from GitHub returns to skills page", async () => {
    const setupPage = page.locator('[aria-label="GitHub setup"]');
    await setupPage.getByRole("button", { name: "Back" }).click();
    await expect(page.locator('[aria-label="Skills setup"]')).toBeVisible({ timeout: 5_000 });
  });

  // ── Trello ──────────────────────────────────────────────

  test("click Connect on Trello opens Trello setup page", async () => {
    const card = page.locator('[role="group"][aria-label="Trello"]');
    await expect(card).toBeVisible();
    await card.getByText("Connect").click();

    const setupPage = page.locator('[aria-label="Trello setup"]');
    await expect(setupPage).toBeVisible({ timeout: 5_000 });
  });

  test("back from Trello returns to skills page", async () => {
    const setupPage = page.locator('[aria-label="Trello setup"]');
    await setupPage.getByRole("button", { name: "Back" }).click();
    await expect(page.locator('[aria-label="Skills setup"]')).toBeVisible({ timeout: 5_000 });
  });

  // ── Google Workspace ────────────────────────────────────

  test("click Connect on Google Workspace opens setup page", async () => {
    const card = page.locator('[role="group"][aria-label="Google Workspace"]');
    await expect(card).toBeVisible();
    await card.getByText("Connect").click();

    const setupPage = page.locator('[aria-label="Google Workspace setup"]');
    await expect(setupPage).toBeVisible({ timeout: 5_000 });

    const emailInput = setupPage.locator('input[type="text"]').first();
    await expect(emailInput).toBeVisible();
  });

  test("back from Google Workspace returns to skills page", async () => {
    const setupPage = page.locator('[aria-label="Google Workspace setup"]');
    await setupPage.getByRole("button", { name: "Back" }).click();
    await expect(page.locator('[aria-label="Skills setup"]')).toBeVisible({ timeout: 5_000 });
  });

  // ── Apple Notes (macOS only) ────────────────────────────

  test("click Connect on Apple Notes opens setup page", async () => {
    test.skip(!isMac, "Apple Notes is macOS only");

    const card = page.locator('[role="group"][aria-label="Apple Notes"]');
    await expect(card).toBeVisible();
    await card.getByText("Connect").click();

    const setupPage = page.locator('[aria-label="Apple Notes setup"]');
    await expect(setupPage).toBeVisible({ timeout: 5_000 });

    await expect(setupPage.getByRole("button", { name: "Connect" })).toBeVisible();
  });

  test("back from Apple Notes returns to skills page", async () => {
    test.skip(!isMac, "Apple Notes is macOS only");

    const setupPage = page.locator('[aria-label="Apple Notes setup"]');
    await setupPage.getByRole("button", { name: "Back" }).click();
    await expect(page.locator('[aria-label="Skills setup"]')).toBeVisible({ timeout: 5_000 });
  });

  // ── Apple Reminders (macOS only) ────────────────────────

  test("click Connect on Apple Reminders opens setup page", async () => {
    test.skip(!isMac, "Apple Reminders is macOS only");

    const card = page.locator('[role="group"][aria-label="Apple Reminders"]');
    await expect(card).toBeVisible();
    await card.getByText("Connect").click();

    const setupPage = page.locator('[aria-label="Apple Reminders setup"]');
    await expect(setupPage).toBeVisible({ timeout: 5_000 });

    await expect(setupPage.getByRole("button", { name: "Connect" })).toBeVisible();
  });

  test("back from Apple Reminders returns to skills page", async () => {
    test.skip(!isMac, "Apple Reminders is macOS only");

    const setupPage = page.locator('[aria-label="Apple Reminders setup"]');
    await setupPage.getByRole("button", { name: "Back" }).click();
    await expect(page.locator('[aria-label="Skills setup"]')).toBeVisible({ timeout: 5_000 });
  });

  // ── Obsidian ────────────────────────────────────────────

  test("click Connect on Obsidian opens setup page", async () => {
    const card = page.locator('[role="group"][aria-label="Obsidian"]');
    await expect(card).toBeVisible();
    await card.getByText("Connect").click();

    const setupPage = page.locator('[aria-label="Obsidian setup"]');
    await expect(setupPage).toBeVisible({ timeout: 5_000 });
  });

  test("back from Obsidian returns to skills page", async () => {
    const setupPage = page.locator('[aria-label="Obsidian setup"]');
    await setupPage.getByRole("button", { name: "Back" }).click();
    await expect(page.locator('[aria-label="Skills setup"]')).toBeVisible({ timeout: 5_000 });
  });
});
