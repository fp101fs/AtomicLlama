import { test, expect, type Page } from "@playwright/test";
import {
  type AppContext,
  launchApp,
  closeApp,
  finishOnboarding,
  getTestCredentials,
} from "./helpers";

const creds = getTestCredentials();

test.describe("What's New modal (version upgrade)", () => {
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

  test("complete onboarding to reach chat page", async () => {
    test.setTimeout(120_000);
    await finishOnboarding(page, creds!);
  });

  test("simulate version upgrade and trigger modal on reload", async () => {
    test.setTimeout(30_000);

    // Pretend this is an upgrade from an older version
    await page.evaluate(() => {
      localStorage.setItem("openclaw.desktop.launched", "1");
      localStorage.setItem("whatsNew_lastVersion", "0.0.1");
    });

    await page.reload();
    await page.waitForTimeout(2_000);

    const modal = page.getByRole("dialog", { name: "What's new" });
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal).toContainText("has been released");
  });

  test("Got it button closes the modal", async () => {
    const modal = page.getByRole("dialog", { name: "What's new" });
    const gotItBtn = modal.getByRole("button", { name: "Got it" });
    await expect(gotItBtn).toBeVisible();
    await gotItBtn.click();

    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  test("modal does not reappear after dismissal", async () => {
    await page.reload();
    await page.waitForTimeout(3_000);

    const modal = page.getByRole("dialog", { name: "What's new" });
    await expect(modal).not.toBeVisible();
  });
});
