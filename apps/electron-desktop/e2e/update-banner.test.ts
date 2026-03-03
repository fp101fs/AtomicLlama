import { test, expect, type Page } from "@playwright/test";
import {
  type AppContext,
  launchApp,
  closeApp,
  finishOnboarding,
  simulateUpdaterEvent,
  getTestCredentials,
} from "./helpers";

const creds = getTestCredentials();

/**
 * Locate the UpdateBanner specifically (not BannerCarousel promo banners).
 * The update banner contains unique text like "Update available" / "ready to install" / "Update failed".
 */
function updateBanner(page: Page) {
  return page
    .locator('[role="status"]')
    .filter({ hasText: /Update available|Downloading|ready to install|Update failed/ });
}

test.describe("Update banner (simulated IPC events)", () => {
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

  test("updater-available shows banner with Download button", async () => {
    await simulateUpdaterEvent(ctx.app, "updater-available", { version: "99.0.0" });
    await page.waitForTimeout(500);

    const banner = updateBanner(page);
    await expect(banner).toBeVisible({ timeout: 5_000 });
    await expect(banner).toContainText("v99.0.0");
    await expect(banner.getByText("Download")).toBeVisible();
  });

  test("dismiss banner hides it", async () => {
    const banner = updateBanner(page);
    await banner.locator('[aria-label="Dismiss"]').click();

    await expect(banner).not.toBeVisible({ timeout: 3_000 });
  });

  test("updater-downloaded shows ready-to-install banner", async () => {
    await simulateUpdaterEvent(ctx.app, "updater-downloaded", { version: "99.0.0" });
    await page.waitForTimeout(500);

    const banner = updateBanner(page);
    await expect(banner).toBeVisible({ timeout: 5_000 });
    await expect(banner).toContainText("ready to install");
    await expect(banner.getByText("Restart & Update")).toBeVisible();
  });

  test("dismiss ready banner hides it", async () => {
    const banner = updateBanner(page);
    await banner.locator('[aria-label="Dismiss"]').click();

    await expect(banner).not.toBeVisible({ timeout: 3_000 });
  });

  test("updater-error shows error banner", async () => {
    // Reset dismissed state by triggering updater-available, then simulate download + error
    await simulateUpdaterEvent(ctx.app, "updater-available", { version: "99.1.0" });
    await page.waitForTimeout(300);
    await simulateUpdaterEvent(ctx.app, "updater-download-progress", { percent: 50 });
    await page.waitForTimeout(300);
    await simulateUpdaterEvent(ctx.app, "updater-error", { message: "Network failure" });
    await page.waitForTimeout(500);

    const banner = updateBanner(page);
    await expect(banner).toBeVisible({ timeout: 5_000 });
    await expect(banner).toContainText("Update failed");
    await expect(banner).toContainText("Network failure");
  });
});
