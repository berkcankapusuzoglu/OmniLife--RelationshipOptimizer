"use client";

import { createContext, useContext } from "react";

/**
 * Publishes the server flag `NATIVE_BILLING_ENABLED` to client descendants.
 *
 * The premium gates sit several levels below the server pages that can read the
 * flag, and drilling it through every client component in between is noise. The
 * dashboard layout provides it once.
 *
 * The default is `false`: a tree without a provider keeps the policy-safe silent
 * lock on native, so forgetting to wrap something can never cause the app to
 * offer a purchase it should not.
 */
const NativeBillingContext = createContext(false);

export function NativeBillingProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <NativeBillingContext.Provider value={enabled}>{children}</NativeBillingContext.Provider>
  );
}

export function useNativeBilling(): boolean {
  return useContext(NativeBillingContext);
}
