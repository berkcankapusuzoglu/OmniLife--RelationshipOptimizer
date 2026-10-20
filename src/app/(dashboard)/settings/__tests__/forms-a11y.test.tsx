import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportData, updateProfile, updateWeights } from "@/app/(dashboard)/settings/actions";
import { clampPercent, validateWeights } from "@/app/(dashboard)/settings/weights-validation";
import { SettingsClient } from "@/app/(dashboard)/settings/settings-client";
import type { Weights } from "@/lib/engine/types";

/**
 * QA forms-a11y: D-14 (profile save surfaces errors), D-20 (weights clamp,
 * disabled Save when invalid, success feedback), D-56 (export feedback and
 * no double download).
 */

vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({ fail: false, sets: [] as unknown[], selects: 0 }));
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    update: () => ({
      set: (values: unknown) => ({
        where: async () => {
          if (db.fail) throw new Error("connection reset");
          db.sets.push(values);
        },
      }),
    }),
    select: () => { db.selects += 1; return { from: () => ({ where: async () => [] }) }; },
  }),
}));
vi.mock("@/lib/auth/guard", () => ({ requireAuth: async () => ({ id: "user-1", passwordHash: "x" }) }));
vi.mock("@/lib/auth/tier-gate", () => ({ hasFeatureAccess: async () => ({ allowed: true }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`Redirect:${url}`); }, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" } }));
vi.mock("@/lib/auth/actions", () => ({ logoutAction: vi.fn() }));
vi.mock("@/lib/revenuecat/sync", () => ({ syncRevenueCatEntitlement: vi.fn() }));
vi.mock("@/app/(public)/delete-account/delete-account-client", () => ({ DeleteAccountClient: () => null }));
// Element-tree inspection without a DOM renderer: state setters are inert and refs are plain objects.
vi.mock("react", async importOriginal => ({
  ...await importOriginal<typeof import("react")>(),
  useState: (value: unknown) => [typeof value === "function" ? (value as () => unknown)() : value, () => {}],
  useRef: (value: unknown) => ({ current: value }),
  useEffect: () => {},
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));

const weights: Weights = {
  alpha: 0.5, beta: 0.5,
  pillar: { vitality: 0.25, growth: 0.25, security: 0.25, connection: 0.25 },
  rel: { emotional: 0.2, trust: 0.2, fairness: 0.2, stress: 0.2, autonomy: 0.2 },
};
const user = { id: "user-1", name: "Alice", email: "alice@example.test", subscriptionTier: "free", subscriptionExpiresAt: null, stripeCustomerId: null };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}
type ElementProps = { children?: React.ReactNode; onClick?: () => Promise<void> | void; value?: string };
function elements(node: React.ReactNode): React.ReactElement<ElementProps>[] {
  const result: React.ReactElement<ElementProps>[] = [];
  React.Children.forEach(node, child => {
    if (React.isValidElement<ElementProps>(child)) result.push(child, ...elements(child.props.children));
  });
  return result;
}
function control(node: React.ReactNode, label: string) {
  return elements(node).find(e => React.Children.toArray(e.props.children).includes(label) && e.props.onClick)?.props.onClick;
}
function panel(tree: React.ReactNode, value: string) {
  return elements(tree).find(e => e.props.value === value && typeof e.props.children !== "string")?.props.children;
}

beforeEach(() => { db.fail = false; db.sets = []; db.selects = 0; vi.stubGlobal("React", React); });

describe("D-14 updateProfile returns a result instead of throwing", () => {
  it("rejects an empty or whitespace-only name with {error}", async () => {
    expect(await updateProfile(form({ name: "   " }))).toEqual({ error: expect.stringMatching(/1 and 100/) });
    expect(db.sets).toHaveLength(0);
  });
  it("rejects a 2000-character name with {error}", async () => {
    expect(await updateProfile(form({ name: "x".repeat(2000) }))).toEqual({ error: expect.any(String) });
    expect(db.sets).toHaveLength(0);
  });
  it("saves a trimmed valid name and reports ok", async () => {
    expect(await updateProfile(form({ name: "  Alice  " }))).toEqual({ ok: true });
    expect(db.sets).toEqual([{ name: "Alice" }]);
  });
  it("turns a database failure into {error} rather than an unhandled rejection", async () => {
    db.fail = true;
    expect(await updateProfile(form({ name: "Alice" }))).toEqual({ error: expect.stringMatching(/try again/i) });
  });
});

describe("D-20 updateWeights validates and reports", () => {
  it("returns {error} for out-of-range weights without writing", async () => {
    expect(await updateWeights({ ...weights, pillar: { ...weights.pillar, vitality: 9.99, growth: -3 } })).toEqual({ error: expect.stringMatching(/0 and 100/) });
    expect(db.sets).toHaveLength(0);
  });
  it("returns ok on success and {error} on a database failure", async () => {
    expect(await updateWeights(weights)).toEqual({ ok: true });
    expect(db.sets[0]).toMatchObject({ alphaWeight: "0.5", pillarVitalityWeight: "0.25" });
    db.fail = true;
    expect(await updateWeights(weights)).toEqual({ error: expect.any(String) });
  });
});

describe("D-20 client-side weight clamping and validation", () => {
  it("clamps typed percentages to 0–100 and treats NaN as 0", () => {
    expect(clampPercent(999)).toBe(100);
    expect(clampPercent(-300)).toBe(0);
    expect(clampPercent(42)).toBe(42);
    expect(clampPercent(Number.NaN)).toBe(0);
  });
  it("accepts a normalised set and flags negative siblings", () => {
    expect(validateWeights(weights)).toBeNull();
    expect(validateWeights({ ...weights, pillar: { ...weights.pillar, vitality: 9.99, growth: -3 } })).toMatch(/between 0 and 100/);
  });
  // Tabs render only the active panel statically, so inspect the weights panel subtree.
  function saveButton(markup: string) {
    const index = markup.indexOf("Save Weights");
    expect(index).toBeGreaterThan(-1);
    return markup.slice(markup.lastIndexOf("<button", index), index);
  }
  it("disables Save Weights and shows the reason when the state is invalid", () => {
    const tree = SettingsClient({ user, weights: { ...weights, rel: { ...weights.rel, trust: -0.5 } } });
    const html = renderToStaticMarkup(<>{panel(tree, "weights")}</>);
    expect(saveButton(html)).toMatch(/\sdisabled=""/);
    expect(html).toContain('id="weights-invalid" role="alert"');
    expect(html).toContain("between 0 and 100");
  });
  it("renders Save Weights enabled for a valid state", () => {
    const html = renderToStaticMarkup(<>{panel(SettingsClient({ user, weights }), "weights")}</>);
    expect(saveButton(html)).not.toMatch(/\sdisabled=""/);
    expect(html).not.toContain('role="alert"');
  });
});

describe("D-14 profile form markup", () => {
  it("limits the name input to 100 characters and requires it", () => {
    const html = renderToStaticMarkup(<SettingsClient user={user} weights={weights} />);
    const input = html.match(/<input[^>]*name="name"[^>]*>/)?.[0] ?? "";
    expect(input).toMatch(/maxlength="100"/i);
    expect(input).toContain("required");
  });
});

describe("D-56 export feedback and double-download guard", () => {
  it("starts only one export for two synchronous taps", async () => {
    const tree = SettingsClient({ user, weights });
    const onClick = control(panel(tree, "data"), "Export Data")!;
    expect(onClick).toBeTypeOf("function");
    // The browser download path is not available in node; the action still runs to completion first.
    vi.stubGlobal("URL", { createObjectURL: () => "blob:x", revokeObjectURL: () => {} });
    vi.stubGlobal("document", { createElement: () => ({ click: () => {} }) });
    vi.stubGlobal("Blob", class { constructor(public parts: unknown[]) {} });
    await Promise.all([onClick(), onClick()]);
    // One export reads three tables; a second concurrent export would double that.
    expect(db.selects).toBe(3);
    // The guard releases afterwards so a later export is possible.
    await onClick();
    expect(db.selects).toBe(6);
    expect(await exportData()).toMatchObject({ dailyLogs: [], scores: [], weeklyCheckins: [] });
  });
  it("renders the export control with a busy flag and no alert() fallback", () => {
    const html = renderToStaticMarkup(<>{panel(SettingsClient({ user, weights }), "data")}</>);
    const index = html.indexOf("Export Data");
    expect(index).toBeGreaterThan(-1);
    expect(html.slice(html.lastIndexOf("<button", index), index)).toContain('aria-busy="false"');
  });
});
