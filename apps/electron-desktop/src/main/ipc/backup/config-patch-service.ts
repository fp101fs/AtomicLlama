import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import JSON5 from "json5";

export function detectOldStateDir(configPath: string): string | null {
  try {
    if (!fs.existsSync(configPath)) return null;
    const text = fs.readFileSync(configPath, "utf-8");
    const cfg = JSON5.parse(text);
    if (!cfg || typeof cfg !== "object") return null;

    const defaultWs = cfg.agents?.defaults?.workspace;
    if (typeof defaultWs === "string" && defaultWs.length > 0) {
      return path.posix.dirname(defaultWs.replaceAll("\\", "/"));
    }

    if (Array.isArray(cfg.agents?.list)) {
      for (const agent of cfg.agents.list) {
        if (agent && typeof agent.workspace === "string") {
          return path.posix.dirname(agent.workspace.replaceAll("\\", "/"));
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function rewritePathsInDir(
  dir: string,
  oldStr: string,
  newStr: string
): Promise<number> {
  let count = 0;
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await rewritePathsInDir(fullPath, oldStr, newStr);
    } else if (entry.isFile()) {
      try {
        const buf = await fsp.readFile(fullPath);
        const sample = buf.subarray(0, 8192);
        if (sample.includes(0)) continue;

        const text = buf.toString("utf-8");
        if (text.includes(oldStr)) {
          await fsp.writeFile(fullPath, text.replaceAll(oldStr, newStr), "utf-8");
          count++;
        }
      } catch {
        // skip unreadable/unwritable files
      }
    }
  }
  return count;
}

export function patchRestoredConfig(configPath: string, currentStateDir: string): void {
  try {
    if (!fs.existsSync(configPath)) return;

    const text = fs.readFileSync(configPath, "utf-8");
    const cfg = JSON5.parse(text);
    if (!cfg || typeof cfg !== "object") return;

    const defaultWorkspace = path.join(currentStateDir, "workspace");

    if (typeof cfg.agents?.defaults?.workspace === "string") {
      cfg.agents.defaults.workspace = defaultWorkspace;
    }

    if (Array.isArray(cfg.agents?.list)) {
      for (const agent of cfg.agents.list) {
        if (agent && typeof agent.workspace === "string") {
          const agentId = typeof agent.id === "string" ? agent.id.trim() : "";
          const isDefault = agent.default === true || agentId === "main";
          agent.workspace = isDefault
            ? defaultWorkspace
            : path.join(currentStateDir, `workspace-${agentId || "unknown"}`);
        }
      }
    }

    if (!cfg.gateway || typeof cfg.gateway !== "object") {
      cfg.gateway = {};
    }
    cfg.gateway.mode = "local";
    cfg.gateway.bind = "loopback";

    if (!cfg.gateway.controlUi || typeof cfg.gateway.controlUi !== "object") {
      cfg.gateway.controlUi = {};
    }
    const allowedOrigins: unknown[] = Array.isArray(cfg.gateway.controlUi.allowedOrigins)
      ? cfg.gateway.controlUi.allowedOrigins
      : [];
    if (!allowedOrigins.includes("null")) {
      allowedOrigins.push("null");
    }
    cfg.gateway.controlUi.allowedOrigins = allowedOrigins;
    cfg.gateway.controlUi.dangerouslyDisableDeviceAuth = true;

    fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`, "utf-8");
    console.log("[ipc/backup] patched restored config for desktop environment");
  } catch (err) {
    console.warn("[ipc/backup] patchRestoredConfig failed:", err);
  }
}
