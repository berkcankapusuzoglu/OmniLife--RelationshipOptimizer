/**
 * Retired native purchase exports retained for existing callers.
 * These functions do not load a purchase SDK or change account access.
 * Historical server-side entitlements are reconciled separately in sync.ts.
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
