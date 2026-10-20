import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PricingPage from "@/app/(public)/pricing/page";
import { PricingClient, yearlySavingsPercent } from "@/app/(public)/pricing/pricing-client";
import { NativeUpgradeButton } from "@/components/native-upgrade-button";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { CoachingClient } from "@/app/(dashboard)/coaching/coaching-client";
import { DeleteAccountClient } from "@/app/(public)/delete-account/delete-account-client";
import { TIERS } from "@/lib/subscription/tiers";

/**
 * QA forms-a11y on pricing and checkout: D-24 (double-tap guard), D-38
 * (upgrade CTAs preselect Premium), D-40 (interval toggle semantics and
 * savings badge), D-55 (delete-account keeps the confirmation, shows pending).
 */

const auth = vi.hoisted(() => ({ user: null as { id: string; subscriptionTier: string } | null }));
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/guard", () => ({ getCurrentUser: async () => auth.user }));
vi.mock("@/lib/revenuecat/sync", () => ({ syncRevenueCatEntitlement: vi.fn() }));
vi.mock("@/lib/subscription/access", () => ({
  getUserTier: async () => "free",
  getEntitlement: async (id: string) => ({ tier: "free", via: "none", expiresAt: null, source: null, ownerId: id }),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/(dashboard)/coaching/actions", () => ({ sendCoachingMessage: vi.fn() }));
vi.mock("@/app/(dashboard)/settings/actions", () => ({ deleteAccountAction: vi.fn() }));
vi.mock("react", async importOriginal => ({
  ...await importOriginal<typeof import("react")>(),
  useState: (value: unknown) => [typeof value === "function" ? (value as () => unknown)() : value, () => {}],
  useRef: (value: unknown) => ({ current: value }),
  useEffect: () => {},
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
  useActionState: (_action: unknown, initial: unknown) => [initial, () => {}, false],
}));

function html(node: React.ReactNode) { return renderToStaticMarkup(node); }
type ElementProps = { children?: React.ReactNode; onClick?: () => Promise<void> | void };
function elements(node: React.ReactNode): React.ReactElement<ElementProps>[] {
  const result: React.ReactElement<ElementProps>[] = [];
  React.Children.forEach(node, child => {
    if (React.isValidElement<ElementProps>(child)) result.push(child, ...elements(child.props.children));
  });
  return result;
}

beforeEach(() => { auth.user = null; fetchMock.mockReset(); vi.stubGlobal("React", React); vi.stubGlobal("fetch", fetchMock); vi.stubEnv("NATIVE_BILLING_ENABLED", ""); });

describe("D-24 checkout double-tap guard", () => {
  it("creates a single Checkout session for two synchronous presses", async () => {
    fetchMock.mockImplementation(async () => ({ ok: false, status: 500, json: async () => ({ error: "nope" }) }));
    const tree = NativeUpgradeButton({ tier: "premium", interval: "monthly" });
    const press = elements(tree).find(e => e.props.onClick)!.props.onClick!;
    await Promise.all([press(), press()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Released after a failed attempt so the user can retry.
    await press();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("D-38 upgrade CTAs deep-link to the Premium plan", () => {
  it("links both prompt buttons to /pricing?plan=premium", () => {
    const markup = html(<UpgradePrompt featureDescription="AI coaching" />);
    const hrefs = markup.match(/href="[^"]+"/g) ?? [];
    expect(hrefs).toHaveLength(2);
    for (const href of hrefs) expect(href).toBe('href="/pricing?plan=premium"');
  });
  it("coaching paywall reuses the deep link", () => {
    const markup = html(<CoachingClient userTier="free" initialSessionId={null} initialMessages={[]} />);
    expect(markup).toContain('href="/pricing?plan=premium"');
    expect(markup).not.toContain('href="/pricing"');
  });
  it("the pricing page reads ?plan=premium and the client highlights and focuses the plan", async () => {
    const page = await PricingPage({ searchParams: Promise.resolve({ plan: "premium" }) });
    expect(page.props.children.props.preselectPlan).toBe("premium");
    const plain = await PricingPage({ searchParams: Promise.resolve({ plan: "pro" }) });
    expect(plain.props.children.props.preselectPlan).toBeNull();
    const markup = html(<PricingClient currentTier="free" preselectPlan="premium" />);
    expect(markup).toContain("Selected");
    expect(markup).toMatch(/aria-current="true"/);
    expect(markup).toMatch(/<button[^>]*autofocus[^>]*>[^<]*(?:<[^>]+>[^<]*)*Go Premium/);
    expect(html(<PricingClient currentTier="free" />)).not.toContain("Selected");
  });
});

describe("D-40 billing interval toggle", () => {
  it("exposes aria-pressed and keeps the savings badge out of the button name", () => {
    const markup = html(<PricingClient currentTier="free" />);
    expect(markup).toMatch(/<button[^>]*aria-pressed="true"[^>]*>Monthly<\/button>/);
    expect(markup).toMatch(/<button[^>]*aria-pressed="false"[^>]*>Yearly<\/button>/);
    expect(markup).toContain(`Save ${yearlySavingsPercent(TIERS.premium.monthlyPrice, TIERS.premium.yearlyPrice)}%`);
  });
  it("derives the saving from the configured prices", () => {
    expect(yearlySavingsPercent(4.99, 24.99)).toBe(58);
    expect(yearlySavingsPercent(3.99, 29.99)).toBe(37);
    expect(yearlySavingsPercent(1, 12)).toBe(0);
    expect(yearlySavingsPercent(0, 10)).toBe(0);
  });
});

describe("D-55 delete-account form", () => {
  it("keeps the confirmation as a controlled field and exposes pending state hooks", () => {
    const markup = html(<DeleteAccountClient />);
    const confirmation = markup.match(/<input[^>]*name="confirmation"[^>]*>/)?.[0] ?? "";
    expect(confirmation).toContain('value=""');
    expect(markup).toContain('aria-busy="false"');
    expect(markup).toContain("Permanently delete my account");
  });
});
