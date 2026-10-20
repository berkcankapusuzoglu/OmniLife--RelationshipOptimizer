/**
 * Server-side billing feature flags.
 *
 * Native purchase UI renders only when this flag is on AND the client is running
 * inside the native bridge; either alone shows nothing. Read it in Server
 * Components and pass the boolean down as a plain prop.
 */
export function nativeBillingEnabled(): boolean {
  return process.env.NATIVE_BILLING_ENABLED === "true";
}
