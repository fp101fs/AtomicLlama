/**
 * IPC handlers for Ollama (local LLM) operations.
 * No params needed — all requests go directly to the local Ollama HTTP API.
 */
import { ipcMain } from "electron";

import { IPC } from "../../shared/ipc-channels";

const OLLAMA_BASE_URL = "http://localhost:11434";

export function registerOllamaHandlers() {
  ipcMain.handle(IPC.ollamaCheck, async () => {
    try {
      const resp = await fetch(OLLAMA_BASE_URL, { signal: AbortSignal.timeout(2000) });
      return { running: resp.status < 500 };
    } catch {
      return { running: false };
    }
  });

  ipcMain.handle(IPC.ollamaListModels, async () => {
    try {
      const resp = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) {
        return { models: [] };
      }
      const data = (await resp.json()) as {
        models?: Array<{ name: string; size: number; modified_at: string }>;
      };
      return { models: data.models ?? [] };
    } catch {
      return { models: [] };
    }
  });
}
