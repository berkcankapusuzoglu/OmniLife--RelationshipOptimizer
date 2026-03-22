"use client";
import { useEffect } from "react";

export function CapacitorInit() {
  useEffect(() => {
    // Only run in native Capacitor context
    if (
      typeof window !== "undefined" &&
      (window as Record<string, unknown>).Capacitor &&
      typeof (window as Record<string, unknown> & { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform === "function" &&
      (window as Record<string, unknown> & { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform()
    ) {
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
