import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import {
  detectArchiveFormat,
  extractArchiveBuffer,
  readBackupMeta,
  resolveBackupRoot,
} from "./archive-service";

async function makeTempDir(prefix: string): Promise<string> {
  return fsp.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}

describe("backup archive service", () => {
  it("detects zip and gzip magic bytes", () => {
    expect(detectArchiveFormat(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe("zip");
    expect(detectArchiveFormat(Buffer.from([0x1f, 0x8b, 0x08, 0x00]))).toBe("tar.gz");
    expect(detectArchiveFormat(Buffer.from([0x00, 0x11, 0x22, 0x33]))).toBeNull();
  });

  it("resolves backup root for nested single directory layout", async () => {
    const root = await makeTempDir("backup-root");
    const nested = path.join(root, "openclaw");
    await fsp.mkdir(nested, { recursive: true });
    await fsp.writeFile(path.join(nested, "openclaw.json"), "{}", "utf-8");
    await expect(resolveBackupRoot(root)).resolves.toBe(nested);
  });

  it("blocks zip path traversal entries", async () => {
    const outDir = await makeTempDir("backup-extract");
    const zip = new JSZip();
    zip.file("../escape.txt", "bad");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    await expect(extractArchiveBuffer(buffer, outDir, "x.zip")).rejects.toThrow(
      "zip entry escapes destination"
    );
  });

  it("reads backup metadata when present", async () => {
    const root = await makeTempDir("backup-meta");
    await fsp.writeFile(
      path.join(root, "backup-meta.json"),
      JSON.stringify({ mode: "paid", appVersion: "1.0.0" }),
      "utf-8"
    );
    await expect(readBackupMeta(root)).resolves.toMatchObject({
      mode: "paid",
      appVersion: "1.0.0",
    });
  });
});
