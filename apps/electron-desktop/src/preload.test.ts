/**
 * Preload contract test: verifies that contextBridge.exposeInMainWorld is called
 * with the correct API shape, matching the OpenclawDesktopApi contract.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { contextBridge } from "electron";
import { DESKTOP_BRIDGE_KEYS } from "./shared/desktop-bridge-contract";

describe("preload API contract", () => {
  beforeEach(() => {
    vi.mocked(contextBridge.exposeInMainWorld).mockReset();
  });

  it("exposes openclawDesktop with all expected methods", async () => {
    // Import preload to trigger the contextBridge call
    await import("./preload");

    expect(contextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1);
    const [name, api] = vi.mocked(contextBridge.exposeInMainWorld).mock.calls[0];

    expect(name).toBe("openclawDesktop");
    expect(typeof api).toBe("object");

    const desktopApi = api as Record<string, unknown>;

    for (const key of DESKTOP_BRIDGE_KEYS) {
      expect(desktopApi, `Missing API method: ${key}`).toHaveProperty(key);
    }

    // Verify no extra unknown methods (beyond what we declared)
    const allKeys = Object.keys(desktopApi);
    for (const key of allKeys) {
      expect(DESKTOP_BRIDGE_KEYS, `Unexpected API method: ${key}`).toContain(
        key as (typeof DESKTOP_BRIDGE_KEYS)[number]
      );
    }
  });
});
