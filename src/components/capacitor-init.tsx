"use client";
import { useEffect } from "react";

export function CapacitorInit() {
  useEffect(() => {
    // Only run in native Capacitor context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = typeof window !== "undefined" ? (window as any)?.Capacitor : null;
    if (cap?.isNativePlatform?.()) {
      import("@capacitor/status-bar")
        .then(({ StatusBar, Style }) => {
          StatusBar.setStyle({ style: Style.Dark });
          StatusBar.setBackgroundColor({ color: "#09090b" });
        })
        .catch(() => {});

      import("@capacitor/push-notifications")
        .then(({ PushNotifications }) => {
          PushNotifications.requestPermissions().then((result) => {
            if (result.receive === "granted") {
              PushNotifications.register();
            }
          });
          PushNotifications.addListener("registration", (token) => {
            // Store token — send to server later
            console.log("Push token:", token.value);
            localStorage.setItem("pushToken", token.value);
          });
        })
        .catch(() => {});
    }
  }, []);

  return null;
}
