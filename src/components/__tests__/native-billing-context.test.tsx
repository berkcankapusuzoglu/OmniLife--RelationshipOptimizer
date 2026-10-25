import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The gates live in client components several levels below the server pages that
 * can read `NATIVE_BILLING_ENABLED`. Rather than drilling the flag through every
 * one of them, the dashboard layout publishes it once and the gates read it.
 *
 * The default is false everywhere, so a tree without the provider keeps the
 * policy-safe silent lock on native.
 */

const platform = vi.hoisted(() => ({ native: true as boolean | undefined }));
vi.mock("@/lib/capacitor/platform", () => ({
  useNativePlatform: () => platform.native,
  isNativePlatform: () => platform.native === true,
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
}));

const { PremiumGate } = await import("@/components/premium-gate");
const { NativeBillingProvider } = await import("@/components/native-billing-provider");

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

beforeEach(() => {
  platform.native = true;
});

describe("native billing context", () => {
  it("lets a gate deep in the tree offer the paywall", () => {
    const markup = html(
      <NativeBillingProvider enabled>
        <div>
          <section>
            <PremiumGate userTier="free" feature="insights">
              <p>Insight chart</p>
            </PremiumGate>
          </section>
        </div>
      </NativeBillingProvider>
    );
    expect(markup).toMatch(/href="\/settings/);
  });

  it("keeps the gate silent when the provider says billing is off", () => {
    const markup = html(
      <NativeBillingProvider enabled={false}>
        <PremiumGate userTier="free" feature="insights">
          <p>Insight chart</p>
        </PremiumGate>
      </NativeBillingProvider>
    );
    expect(markup).not.toMatch(/href="\/settings/);
    expect(markup).toMatch(/not available|unavailable/i);
  });

  it("defaults to off with no provider in the tree", () => {
    const markup = html(
      <PremiumGate userTier="free" feature="insights">
        <p>Insight chart</p>
      </PremiumGate>
    );
    expect(markup).not.toMatch(/href="\/settings/);
  });

  it("lets an explicit prop win over the provider", () => {
    const markup = html(
      <NativeBillingProvider enabled={false}>
        <PremiumGate userTier="free" feature="insights" nativeBilling>
          <p>Insight chart</p>
        </PremiumGate>
      </NativeBillingProvider>
    );
    expect(markup).toMatch(/href="\/settings/);
  });
});
