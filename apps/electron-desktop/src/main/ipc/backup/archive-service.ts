import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import JSZip from "jszip";

const execFileAsync = promisify(execFile);

export type BackupMeta = { mode?: string; savedAt?: string; appVersion?: string };
export type ArchiveFormat = "zip" | "tar.gz";

export async function addDirToZip(zip: JSZip, dirPath: string, baseDir: string): Promise<void> {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      zip.folder(relativePath);
      await addDirToZip(zip, fullPath, baseDir);
    } else if (entry.isFile()) {
      const data = await fsp.readFile(fullPath);
      zip.file(relativePath, data);
    }
  }
}

export async function resolveBackupRoot(extractDir: string): Promise<string> {
  try {
    await fsp.stat(path.join(extractDir, "openclaw.json"));
    return extractDir;
  } catch {
    // not at top level
  }

  const entries = await fsp.readdir(extractDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  if (dirs.length === 1 && dirs[0]) {
    const candidate = path.join(extractDir, dirs[0].name);
    try {
      await fsp.stat(path.join(candidate, "openclaw.json"));
      return candidate;
    } catch {
      // not there either
    }
  }

  throw new Error("Invalid backup: openclaw.json not found in the archive");
}

function isPathInsideDir(candidatePath: string, dirPath: string): boolean {
  const rel = path.relative(dirPath, candidatePath);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

async function extractZipBuffer(buffer: Buffer, destDir: string): Promise<void> {
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files);
  for (const entry of entries) {
    const entryPath = entry.name.replaceAll("\\", "/");
    if (!entryPath || entryPath.endsWith("/")) {
      const dirPath = path.resolve(destDir, entryPath);
      if (!isPathInsideDir(dirPath, destDir)) {
        throw new Error(`zip entry escapes destination: ${entry.name}`);
      }
      await fsp.mkdir(dirPath, { recursive: true });
      continue;
    }
    const outPath = path.resolve(destDir, entryPath);
    if (!isPathInsideDir(outPath, destDir)) {
      throw new Error(`zip entry escapes destination: ${entry.name}`);
    }
    await fsp.mkdir(path.dirname(outPath), { recursive: true });
    const data = await entry.async("nodebuffer");
    await fsp.writeFile(outPath, data);
  }
}

async function extractTarGzBuffer(buffer: Buffer, destDir: string): Promise<void> {
  const tmpTar = path.join(os.tmpdir(), `openclaw-tgz-${randomBytes(8).toString("hex")}.tar.gz`);
  await fsp.writeFile(tmpTar, buffer);
  try {
    await execFileAsync("tar", ["-xzf", tmpTar, "-C", destDir]);
  } finally {
    await fsp.rm(tmpTar, { force: true }).catch(() => {});
  }
}

export function detectArchiveFormat(buffer: Buffer): ArchiveFormat | null {
  if (buffer.length < 4) return null;
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return "zip";
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) return "tar.gz";
  return null;
}

export async function extractArchiveBuffer(
  buffer: Buffer,
  destDir: string,
  filenameHint?: string
): Promise<void> {
  const format = detectArchiveFormat(buffer);
  if (format === "zip") {
    return extractZipBuffer(buffer, destDir);
  }
  if (format === "tar.gz") {
    return extractTarGzBuffer(buffer, destDir);
  }
  if (filenameHint) {
    const lower = filenameHint.toLowerCase();
    if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) {
      return extractTarGzBuffer(buffer, destDir);
    }
    if (lower.endsWith(".zip")) {
      return extractZipBuffer(buffer, destDir);
    }
  }
  throw new Error("Unsupported archive format. Please use .zip or .tar.gz");
}

export async function readBackupMeta(backupRoot: string): Promise<BackupMeta> {
  try {
    const raw = await fsp.readFile(path.join(backupRoot, "backup-meta.json"), "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as BackupMeta) : {};
  } catch {
    return {};
  }
}
