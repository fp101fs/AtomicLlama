import { describe, expect, it, vi } from "vitest";

import { buildAuthProfilePatch, patchAuthProfile } from "./authProfiles";

describe("authProfiles utils", () => {
  it("builds expected auth profile patch JSON", () => {
    const raw = buildAuthProfilePatch({
      profileId: "openai:default",
      provider: "openai",
      mode: "api_key",
    });
    const parsed = JSON.parse(raw);
    expect(parsed.auth.profiles["openai:default"]).toEqual({
      provider: "openai",
      mode: "api_key",
    });
    expect(parsed.auth.order.openai).toEqual(["openai:default"]);
  });

  it("patches auth profile and returns profile id", async () => {
    const gw = { request: vi.fn(async () => ({})) };
    const profileId = await patchAuthProfile({
      gw,
      baseHash: "hash-1",
      provider: "openrouter",
      mode: "token",
      notePrefix: "Settings",
    });
    expect(profileId).toBe("openrouter:default");
    expect(gw.request).toHaveBeenCalledWith(
      "config.patch",
      expect.objectContaining({
        baseHash: "hash-1",
        note: "Settings: enable openrouter token profile",
      })
    );
  });
});
