import { App } from "@capacitor/app";

let initialized = false;

export function initAndroidBackHandler(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.minimizeApp();
    }
  });
}
