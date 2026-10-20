/**
 * Legacy no-op purchase exports retained for existing callers, plus the
 * v1.1.0 client re-exports (see client.ts). The legacy functions never load a
 * purchase SDK or change account access; server-side entitlements are
 * reconciled separately in sync.ts.
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

export {
  configureRevenueCat,
  isRevenueCatConfigured,
  loadOffering,
  managementUrl,
  purchase,
  restore,
  revenueCatPublicKey,
  type BillingPackage,
  type BillingPackageId,
  type OfferingResult,
  type PurchaseOutcome,
} from "./client";
