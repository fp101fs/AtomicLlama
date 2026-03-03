import { test, expect, type Page } from "@playwright/test";
import { type AppContext, launchApp, closeApp, waitForConsentScreen } from "./helpers";

test.describe("Restore flow (consent -> restore options -> file restore)", () => {
  test.describe.configure({ mode: "serial" });

  let ctx: AppContext;
  let page: Page;

  test.beforeAll(async () => {
    ctx = await launchApp();
    page = ctx.page;
  });

  test.afterAll(async () => {
    if (ctx) await closeApp(ctx);
  });

  test("consent screen shows Import button", async () => {
    test.setTimeout(60_000);
    await waitForConsentScreen(page);
    await expect(page.getByText("Import an existing setup")).toBeVisible();
  });

  test("click Import navigates to restore option page", async () => {
    await page.getByText("Import an existing setup").click();

    const restorePage = page.locator('[aria-label="Restore option"]');
    await expect(restorePage).toBeVisible({ timeout: 10_000 });
  });

  test("restore option page shows two radio options", async () => {
    await expect(page.getByText("Restore from local OpenClaw instance")).toBeVisible();
    await expect(page.getByText("Restore from backup file")).toBeVisible();
  });

  test("restore option page has Restore now button", async () => {
    await expect(page.getByText("Restore now")).toBeVisible();
  });

  test("restore option page has Back button", async () => {
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
  });

  test("select file radio and click Restore now navigates to file restore", async () => {
    const fileRadio = page.locator('input[name="restore-option"][value="file"]');
    await fileRadio.check({ force: true });
    await page.getByText("Restore now").click();

    const fileRestorePage = page.locator('[aria-label="Restore from backup file"]');
    await expect(fileRestorePage).toBeVisible({ timeout: 5_000 });
  });

  test("file restore page shows drop zone", async () => {
    await expect(page.getByText("Drag ZIP folder here")).toBeVisible();
  });

  test("file restore page has Back button", async () => {
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
  });

  test("back from file restore returns to restore options", async () => {
    await page.getByRole("button", { name: "Back" }).click();

    const restorePage = page.locator('[aria-label="Restore option"]');
    await expect(restorePage).toBeVisible({ timeout: 5_000 });
  });

  test("back from restore options returns to consent screen", async () => {
    await page.getByRole("button", { name: "Back" }).click();

    await waitForConsentScreen(page);
  });
});
