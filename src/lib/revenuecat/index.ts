/**
 * Retired RevenueCat client integration. All functions are inert in this release.
 * Server-granted entitlements are read from the account, not this SDK.
 *
 * Historical configuration (unused by this release):
 *   NEXT_PUBLIC_REVENUECAT_ANDROID_KEY
 *   NEXT_PUBLIC_REVENUECAT_IOS_KEY
 *
 * Historical RevenueCat product catalog:
 *   - Entitlements: "pro", "premium"
 *   - Products (Google Play / App Store):
 *       pro_monthly      → $4.99/mo
 *       pro_yearly       → $39.99/yr
 *       premium_monthly  → $7.99/mo
 *       premium_yearly   → $59.99/yr
 *   - Offerings: map each product to its package
 */

export type RCPackageId = "pro_monthly" | "pro_yearly" | "premium_monthly" | "premium_yearly";

export async function initRevenueCat(_userId: string): Promise<void> {
  void _userId;
}

export async function purchasePackage(_packageId: RCPackageId): Promise<boolean> {
  void _packageId;
  return false;
}

export async function restorePurchases(): Promise<string[]> {
  return [];
}

export async function getCustomerInfo(): Promise<string[]> {
  return [];
}
