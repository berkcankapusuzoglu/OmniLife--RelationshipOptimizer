/**
 * RevenueCat client-side integration for native (iOS/Android) in-app purchases.
 * All functions are no-ops on web — Stripe handles web payments.
 *
 * Environment variables required (NEXT_PUBLIC_ prefix so they're embedded at build time):
 *   NEXT_PUBLIC_REVENUECAT_ANDROID_KEY
 *   NEXT_PUBLIC_REVENUECAT_IOS_KEY
 *
 * RevenueCat dashboard setup needed:
 *   - Entitlements: "pro", "premium"
 *   - Products (Google Play / App Store):
 *       pro_monthly      → $4.99/mo
 *       pro_yearly       → $39.99/yr
 *       premium_monthly  → $7.99/mo
 *       premium_yearly   → $59.99/yr
 *   - Offerings: map each product to its package
 */

import { Capacitor } from "@capacitor/core";

// Lazy-import the SDK so it doesn't crash during Next.js SSR / web builds.
// The SDK only works in native Capacitor environments.
async function getPurchases() {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  return Purchases;
}

export type RCPackageId =
  | "pro_monthly"
  | "pro_yearly"
  | "premium_monthly"
  | "premium_yearly";

/**
 * Call once after the user is authenticated (e.g. in the dashboard layout).
 * Identifies the user with RevenueCat so purchases are linked to their account.
 */
export async function initRevenueCat(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const Purchases = await getPurchases();
    const isAndroid = Capacitor.getPlatform() === "android";
    const apiKey = isAndroid
      ? (process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? "")
      : (process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? "");

    if (!apiKey) {
      console.warn("[RevenueCat] API key not configured");
      return;
    }

    await Purchases.configure({ apiKey });
    await Purchases.logIn({ appUserID: userId });
  } catch (err) {
    console.error("[RevenueCat] init error:", err);
  }
}

/**
 * Triggers the native purchase sheet for the given package.
 * Returns true on success, false if the user cancelled or an error occurred.
 */
export async function purchasePackage(packageId: RCPackageId): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const Purchases = await getPurchases();
    const { current } = await Purchases.getOfferings();
    if (!current) {
      console.warn("[RevenueCat] No current offering configured");
      return false;
    }

    const pkg = current.availablePackages.find(
      (p) => p.identifier === packageId
    );
    if (!pkg) {
      console.warn(`[RevenueCat] Package not found: ${packageId}`);
      return false;
    }

    await Purchases.purchasePackage({ aPackage: pkg });
    return true;
  } catch (err: unknown) {
    // RevenueCat throws with userCancelled = true when user dismisses sheet
    if (
      err &&
      typeof err === "object" &&
      "userCancelled" in err &&
      (err as { userCancelled: boolean }).userCancelled
    ) {
      return false;
    }
    console.error("[RevenueCat] purchase error:", err);
    return false;
  }
}

/**
 * Restores previous purchases (required by App Store guidelines).
 * Returns the restored entitlement identifiers.
 */
export async function restorePurchases(): Promise<string[]> {
  if (!Capacitor.isNativePlatform()) return [];

  try {
    const Purchases = await getPurchases();
    const info = await Purchases.restorePurchases();
    return Object.keys(info.customerInfo.entitlements.active);
  } catch (err) {
    console.error("[RevenueCat] restore error:", err);
    return [];
  }
}

/**
 * Returns the active entitlement identifiers for the current user.
 */
export async function getCustomerInfo(): Promise<string[]> {
  if (!Capacitor.isNativePlatform()) return [];

  try {
    const Purchases = await getPurchases();
    const info = await Purchases.getCustomerInfo();
    return Object.keys(info.customerInfo.entitlements.active);
  } catch (err) {
    console.error("[RevenueCat] getCustomerInfo error:", err);
    return [];
  }
}
