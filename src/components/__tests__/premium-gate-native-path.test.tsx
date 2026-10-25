import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A free user on Android who hits a locked feature used to see only
 * "This feature is not available for your account" — no button, no route to
 * subscribe. The only purchase surfaces were /settings and /pricing, which they
 * had to go looking for.
 *
 * That is the shape RevenueCat blames for Android's 0.9% download-to-paid against
 * iOS's 2.6%: users never reach a paywall. With 89.4% of trial starts happening
 * on install day, a paywall buried in Settings converts almost nobody.
 *
 * The gate must therefore offer a route to the in-app, store-priced paywall —
 * while still obeying the billing policy: no web prices and no `pricing` route in
 * native markup, and nothing at all when the native billing flag is off.
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

const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const visibleText = (markup: string) => markup.replace(/<[^>]*>/g, " ");

beforeEach(() => {
  platform.native = true;
});

describe("PremiumGate purchase path on native", () => {
  it("offers a route to the in-app paywall when native billing is enabled", () => {
    const markup = html(
      <PremiumGate userTier="free" feature="insights" nativeBilling>
        <p>Insight chart</p>
      </PremiumGate>
    );
    expect(markup).toMatch(/href="\/settings/);
  });

  it("carries no web price and no pricing route even when enabled", () => {
    const markup = html(
      <PremiumGate userTier="free" feature="insights" nativeBilling>
        <p>Insight chart</p>
      </PremiumGate>
    );
    expect(visibleText(markup)).not.toMatch(/\$|4\.99|7\.99|24\.99|39\.99|Go Premium|Compare Plans/i);
    expect(markup).not.toMatch(/href="[^"]*(?:pricing|checkout|stripe)/i);
  });

  it("stays silent about billing when the flag is off", () => {
    const markup = html(
      <PremiumGate userTier="free" feature="insights">
        <p>Insight chart</p>
      </PremiumGate>
    );
    expect(visibleText(markup)).not.toMatch(/\$|Upgrade|Go Premium|free trial/i);
    expect(markup).not.toMatch(/href="[^"]*(?:pricing|checkout|stripe|settings)/i);
    expect(markup).toMatch(/not available|unavailable/i);
  });

  it("still lets an entitled user straight through", () => {
    const markup = html(
      <PremiumGate userTier="premium" feature="insights" nativeBilling>
        <p>Insight chart</p>
      </PremiumGate>
    );
    expect(markup).toBe("<p>Insight chart</p>");
  });

  it("keeps the web upgrade button and price on the web", () => {
    platform.native = false;
    const markup = html(
      <PremiumGate userTier="free" feature="insights">
        <p>Insight chart</p>
      </PremiumGate>
    );
    expect(markup).toMatch(/href="\/pricing"/);
  });

  it("offers nothing before hydration knows the platform", () => {
    platform.native = undefined;
    const markup = html(
      <PremiumGate userTier="free" feature="insights" nativeBilling>
        <p>Insight chart</p>
      </PremiumGate>
    );
    expect(markup).not.toMatch(/href="\/(settings|pricing)/);
  });
});
