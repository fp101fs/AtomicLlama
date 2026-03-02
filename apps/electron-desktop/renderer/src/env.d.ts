import type { OpenclawDesktopApi } from "../../src/shared/desktop-bridge-contract";

declare global {
  interface Window {
    openclawDesktop?: OpenclawDesktopApi;
  }
}
