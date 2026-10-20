"use client";

/**
 * Thin client wrapper around the RevenueCat Capacitor SDK.
 *
 * The plugin is loaded with a dynamic import so web bundles and server renders
 * never touch native code. Every function fails closed (returns an explicit
 * state) instead of throwing; the server remains the authority on access —
 * callers must `syncRevenueCatEntitlement()` after a purchase or restore.
 */

import { isNativePlatform } from "@/lib/capacitor/platform";

export type BillingPackageId = "premium_monthly" | "premium_yearly";

export type PurchaseOutcome =
  | { status: "success" }
  | { status: "cancelled" }
  | { status: "pending" }
  | { status: "already-owned" }
  | { status: "error"; code: string; message: string };

export interface BillingPackage {
  id: BillingPackageId;
  /** Localized price from the store. Never hard-code prices on native. */
  priceString: string;
  period: "P1M" | "P1Y";
  trialDays: number | null;
}

export type OfferingResult =
  | { packages: BillingPackage[] }
  | { error: "no-offering" | "not-configured" | "network" };

type PurchasesModule = typeof import("@revenuecat/purchases-capacitor");
type PurchasesPackage = import("@revenuecat/purchases-capacitor").PurchasesPackage;

let configuredUserId: string | null = null;
let configuring: Promise<boolean> | null = null;
let sdk: PurchasesModule | null = null;

async function loadSdk(): Promise<PurchasesModule> {
  if (!sdk) sdk = await import("@revenuecat/purchases-capacitor");
  return sdk;
}

export function revenueCatPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY;
  return key && key.trim().length > 0 ? key : null;
}

/** Configures the SDK once per page load. Resolves false on web or without a public key. */
export async function configureRevenueCat(userId: string): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const apiKey = revenueCatPublicKey();
  if (!apiKey) return false;
  if (configuredUserId === userId) return true;
  if (configuring) return configuring;
  configuring = (async () => {
    try {
      const { Purchases } = await loadSdk();
      await Purchases.configure({ apiKey, appUserID: userId });
      configuredUserId = userId;
      return true;
    } catch (err) {
      console.error("[RevenueCat] configure failed:", err);
      return false;
    } finally {
      configuring = null;
    }
  })();
  return configuring;
}

export function isRevenueCatConfigured(): boolean {
  return configuredUserId !== null;
}

function errorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && err.code != null) return String(err.code);
  return "unknown";
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") return err.message;
  return "Unknown error";
}

function trialDaysOf(pkg: PurchasesPackage): number | null {
  const period = pkg.product.defaultOption?.freePhase?.billingPeriod;
  if (!period) return null;
  switch (period.unit) {
    case "DAY":
      return period.value;
    case "WEEK":
      return period.value * 7;
    case "MONTH":
      return period.value * 30;
    case "YEAR":
      return period.value * 365;
    default:
      return null;
  }
}

function toBillingPackage(pkg: PurchasesPackage): BillingPackage | null {
  const productId = pkg.product.identifier.split(":")[0];
  let id: BillingPackageId | null = null;
  if (productId === "premium_monthly" || pkg.packageType === "MONTHLY") id = "premium_monthly";
  else if (productId === "premium_yearly" || pkg.packageType === "ANNUAL") id = "premium_yearly";
  if (!id) return null;
  return {
    id,
    priceString: pkg.product.priceString,
    period: id === "premium_monthly" ? "P1M" : "P1Y",
    trialDays: trialDaysOf(pkg),
  };
}

async function currentPackages(): Promise<PurchasesPackage[] | null> {
  const { Purchases } = await loadSdk();
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current || current.availablePackages.length === 0) return null;
  return current.availablePackages;
}

export async function loadOffering(): Promise<OfferingResult> {
  if (!isRevenueCatConfigured()) return { error: "not-configured" };
  try {
    const packages = await currentPackages();
    if (!packages) return { error: "no-offering" };
    const mapped = packages.map(toBillingPackage).filter((p): p is BillingPackage => p !== null);
    return mapped.length ? { packages: mapped } : { error: "no-offering" };
  } catch (err) {
    console.error("[RevenueCat] offerings failed:", err);
    return { error: "network" };
  }
}

export async function purchase(id: BillingPackageId): Promise<PurchaseOutcome> {
  if (!isRevenueCatConfigured()) {
    return { status: "error", code: "not-configured", message: "Purchases are unavailable in this build" };
  }
  try {
    const { Purchases, PURCHASES_ERROR_CODE } = await loadSdk();
    const packages = await currentPackages();
    const aPackage = packages?.find((pkg) => toBillingPackage(pkg)?.id === id);
    if (!aPackage) return { status: "error", code: "no-offering", message: "Plan not available" };
    try {
      await Purchases.purchasePackage({ aPackage });
      return { status: "success" };
    } catch (err) {
      const code = errorCode(err);
      if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { status: "cancelled" };
      if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { status: "pending" };
      if (code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) return { status: "already-owned" };
      return { status: "error", code, message: errorMessage(err) };
    }
  } catch (err) {
    console.error("[RevenueCat] purchase failed:", err);
    return { status: "error", code: errorCode(err), message: errorMessage(err) };
  }
}

export async function restore(): Promise<{ active: boolean } | { error: string }> {
  if (!isRevenueCatConfigured()) return { error: "not-configured" };
  try {
    const { Purchases } = await loadSdk();
    const { customerInfo } = await Purchases.restorePurchases();
    return { active: Object.keys(customerInfo.entitlements.active).length > 0 };
  } catch (err) {
    console.error("[RevenueCat] restore failed:", err);
    return { error: errorMessage(err) };
  }
}

export async function managementUrl(): Promise<string | null> {
  if (!isRevenueCatConfigured()) return null;
  try {
    const { Purchases } = await loadSdk();
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo.managementURL ?? null;
  } catch (err) {
    console.error("[RevenueCat] customer info failed:", err);
    return null;
  }
}
