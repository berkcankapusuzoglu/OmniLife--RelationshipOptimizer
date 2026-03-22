// This runs in the Capacitor native context
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return null;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return null;

  await PushNotifications.register();

  return new Promise<string>((resolve) => {
    PushNotifications.addListener("registration", (token) => {
      resolve(token.value);
    });
  });
}
