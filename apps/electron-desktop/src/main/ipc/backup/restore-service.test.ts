import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { performRestoreFromSourceDir } from "./restore-service";

async function makeTempDir(prefix: string): Promise<string> {
  return fsp.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}

describe("backup restore service", () => {
  it("restores from source dir and executes lifecycle hooks", async () => {
    const stateDir = await makeTempDir("restore-state");
    const sourceDir = await makeTempDir("restore-source");
    await fsp.writeFile(
      path.join(sourceDir, "openclaw.json"),
      JSON.stringify({
        agents: { defaults: { workspace: "/old/workspace" } },
        gateway: { mode: "remote", bind: "0.0.0.0" },
      }),
      "utf-8"
    );

    const stopGatewayChild = vi.fn(async () => {});
    const startGateway = vi.fn(async () => {});
    const setGatewayToken = vi.fn();
    const acceptConsent = vi.fn(async () => {});

    await performRestoreFromSourceDir({
      sourceDir,
      stateDir,
      stopGatewayChild,
      startGateway,
      setGatewayToken,
      acceptConsent,
    });

    expect(stopGatewayChild).toHaveBeenCalledTimes(1);
    expect(acceptConsent).toHaveBeenCalledTimes(1);
    expect(startGateway).toHaveBeenCalledTimes(1);
    const restored = await fsp.readFile(path.join(stateDir, "openclaw.json"), "utf-8");
    expect(restored).toContain('"mode": "local"');
  });
});
