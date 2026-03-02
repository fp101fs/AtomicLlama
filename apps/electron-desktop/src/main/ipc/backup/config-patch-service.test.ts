import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { detectOldStateDir, patchRestoredConfig, rewritePathsInDir } from "./config-patch-service";

async function makeTempDir(prefix: string): Promise<string> {
  return fsp.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}

describe("backup config patch service", () => {
  it("detects old state dir from default workspace", async () => {
    const dir = await makeTempDir("config-patch");
    const configPath = path.join(dir, "openclaw.json");
    await fsp.writeFile(
      configPath,
      JSON.stringify({ agents: { defaults: { workspace: "/old-state/workspace" } } }),
      "utf-8"
    );
    expect(detectOldStateDir(configPath)).toBe("/old-state");
  });

  it("rewrites text paths recursively", async () => {
    const dir = await makeTempDir("rewrite-paths");
    await fsp.mkdir(path.join(dir, "nested"), { recursive: true });
    await fsp.writeFile(path.join(dir, "nested", "a.txt"), "old/path/file", "utf-8");
    const rewritten = await rewritePathsInDir(dir, "old/path", "new/path");
    expect(rewritten).toBe(1);
    const text = await fsp.readFile(path.join(dir, "nested", "a.txt"), "utf-8");
    expect(text).toContain("new/path/file");
  });

  it("patches restored config with local gateway settings", async () => {
    const stateDir = await makeTempDir("patch-config-state");
    const configPath = path.join(stateDir, "openclaw.json");
    await fsp.writeFile(
      configPath,
      JSON.stringify({
        agents: { defaults: { workspace: "/old/workspace" } },
        gateway: { mode: "remote", bind: "0.0.0.0" },
      }),
      "utf-8"
    );
    patchRestoredConfig(configPath, stateDir);
    const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(cfg.gateway.mode).toBe("local");
    expect(cfg.gateway.bind).toBe("loopback");
    expect(cfg.agents.defaults.workspace).toBe(path.join(stateDir, "workspace"));
    expect(cfg.gateway.controlUi.allowedOrigins).toContain("null");
  });
});
