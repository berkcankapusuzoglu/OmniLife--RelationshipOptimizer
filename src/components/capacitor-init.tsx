"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initAndroidBackHandler } from "@/lib/capacitor/back-handler";
import { isNativePlatform } from "@/lib/capacitor/platform";

/** Only same-origin in-app paths may be opened from a notification tap. */
function safeInAppPath(data: unknown): string | null {
  const path = (data as { path?: unknown } | undefined)?.path;
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return null;
  return path;
}

export function CapacitorInit() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativePlatform()) return;

    initAndroidBackHandler();

    import("@capacitor/status-bar")
      .then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: "#09090b" });
      })
      .catch(() => {});

    // Wire notification taps to in-app navigation only. Permission is never
    // requested here; enablePushNotifications() owns that after the first log.
    import("@capacitor/push-notifications")
      .then(({ PushNotifications }) =>
        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const path = safeInAppPath(action?.notification?.data);
          if (path) router.push(path);
        }),
      )
      .catch(() => {});
  }, [router]);

  return null;
}
