import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import { readGatewayTokenFromConfig } from "../../gateway/config";
import { detectOldStateDir, patchRestoredConfig, rewritePathsInDir } from "./config-patch-service";

export async function performRestoreFromSourceDir(params: {
  sourceDir: string;
  stateDir: string;
  stopGatewayChild: () => Promise<void>;
  startGateway: () => Promise<void>;
  setGatewayToken: (token: string) => void;
  acceptConsent: () => Promise<void>;
}): Promise<void> {
  const { sourceDir, stateDir, stopGatewayChild, startGateway, setGatewayToken, acceptConsent } =
    params;
  const preRestoreDir = `${stateDir}.pre-restore`;

  await stopGatewayChild();

  try {
    await fsp.rm(preRestoreDir, { recursive: true, force: true });
  } catch {
    // may not exist
  }
  if (fs.existsSync(stateDir)) {
    await fsp.rename(stateDir, preRestoreDir);
  }

  try {
    await fsp.mkdir(stateDir, { recursive: true });
    await fsp.cp(sourceDir, stateDir, { recursive: true });

    const configPath = path.join(stateDir, "openclaw.json");
    const oldStateDir = detectOldStateDir(configPath);
    if (oldStateDir && oldStateDir !== stateDir) {
      const rewritten = await rewritePathsInDir(stateDir, oldStateDir, stateDir);
      console.log(
        `[ipc/backup] rewrote paths in ${rewritten} file(s): ${oldStateDir} → ${stateDir}`
      );
    }

    patchRestoredConfig(configPath, stateDir);

    const restoredToken = readGatewayTokenFromConfig(configPath);
    if (restoredToken) {
      setGatewayToken(restoredToken);
    }

    await acceptConsent();
    await startGateway();
  } catch (err) {
    try {
      if (fs.existsSync(stateDir)) {
        await fsp.rm(stateDir, { recursive: true, force: true });
      }
      if (fs.existsSync(preRestoreDir)) {
        await fsp.rename(preRestoreDir, stateDir);
      }
      await startGateway();
    } catch (rollbackErr) {
      console.error("[ipc/backup] rollback also failed:", rollbackErr);
    }
    throw err;
  }
}
