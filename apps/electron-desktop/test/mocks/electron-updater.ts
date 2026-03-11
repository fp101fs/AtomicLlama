import { vi } from "vitest";

export const autoUpdater = {
  on: vi.fn(),
  once: vi.fn(),
  checkForUpdates: vi.fn(),
  checkForUpdatesAndNotify: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn(),
  setFeedURL: vi.fn(),
  signals: { updateDownloaded: { subscribe: vi.fn() } },
};
