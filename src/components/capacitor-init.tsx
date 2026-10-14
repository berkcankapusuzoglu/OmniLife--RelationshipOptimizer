"use client";
import { useEffect } from "react";
import { initAndroidBackHandler } from "@/lib/capacitor/back-handler";
import { isNativePlatform } from "@/lib/capacitor/platform";

export function CapacitorInit() {
  useEffect(() => {
    if (isNativePlatform()) {
      initAndroidBackHandler();

      import("@capacitor/status-bar")
        .then(({ StatusBar, Style }) => {
          StatusBar.setStyle({ style: Style.Dark });
          StatusBar.setBackgroundColor({ color: "#09090b" });
        })
        .catch(() => {});
    }
  }, []);

  return null;
}
