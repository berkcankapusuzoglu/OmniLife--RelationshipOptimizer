"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useNativePlatform } from "@/lib/capacitor/platform";
import { disablePushNotifications, enablePushNotifications } from "@/lib/push/capacitor";

function formatHourUtc(hour: number | null): string {
  if (hour === null || !Number.isInteger(hour) || hour < 0 || hour > 23) return "your usual logging time";
  return `${String(hour).padStart(2, "0")}:00 UTC`;
}

/** Daily reminder toggle for the settings page. Reminders are native-only. */
export function NotificationSettings({
  pushOptIn,
  reminderHourUtc,
}: {
  pushOptIn: boolean;
  reminderHourUtc: number | null;
}) {
  const native = useNativePlatform();
  const router = useRouter();
  const [optIn, setOptIn] = useState(pushOptIn);
  const [hour, setHour] = useState<number | null>(reminderHourUtc);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Server HTML and the hydration render stay empty; the client decides.
  if (native === undefined) return null;

  if (!native) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="mb-1 font-medium">Daily reminder</h3>
        <p className="text-sm text-muted-foreground">Reminders are available in the Android app.</p>
      </div>
    );
  }

  const toggle = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (optIn) {
        await disablePushNotifications();
        setOptIn(false);
        setMessage("Reminders are off.");
      } else {
        const result = await enablePushNotifications();
        if (result === "granted") {
          setOptIn(true);
          setHour(null);
          setMessage("Reminders are on.");
        } else if (result === "denied") {
          setMessage("Notifications are blocked. Allow them in your device settings, then try again.");
        } else {
          setMessage("Reminders are available in the Android app.");
        }
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-1 font-medium">Daily reminder</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        {optIn
          ? `One reminder a day around ${formatHourUtc(hour)}, based on when you usually log.`
          : "One reminder a day at the time you usually log. Nothing else."}
      </p>
      <Button variant={optIn ? "outline" : "default"} onClick={toggle} disabled={busy}>
        {busy ? "Working..." : optIn ? "Turn off" : "Turn on"}
      </Button>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
