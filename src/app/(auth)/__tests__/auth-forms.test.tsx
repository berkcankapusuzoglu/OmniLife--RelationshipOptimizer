import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/(auth)/login/page";
import RegisterPage from "@/app/(auth)/register/page";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";
import { PasswordInput } from "@/app/(auth)/password-input";
import { registerAction } from "@/lib/auth/actions";
import { subscribeAction } from "@/app/(public)/actions";

/**
 * QA forms-a11y on the auth surfaces: D-36 (errors announced, inputs marked
 * invalid), D-41 (name trimmed and bounded), D-42 (newsletter email bounds),
 * D-43 (password show/hide), D-44 (links not colour-only).
 */

const action = vi.hoisted(() => ({ error: undefined as string | undefined }));
const params = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("react", async importOriginal => ({
  ...await importOriginal<typeof import("react")>(),
  useActionState: () => [action.error ? { error: action.error } : undefined, () => {}, false],
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => params.values[key] ?? null }),
  redirect: (url: string) => { throw new Error(`Redirect:${url}`); },
}));
vi.mock("@/lib/auth/actions", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/auth/actions")>(), loginAction: vi.fn() }));
vi.mock("@/lib/auth/reset-actions", () => ({ requestPasswordResetAction: vi.fn(), resetPasswordAction: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ createSession: vi.fn(), deleteSession: vi.fn() }));
vi.mock("@/lib/referrals", () => ({ processReferral: vi.fn() }));
const db = vi.hoisted(() => ({ inserted: [] as Record<string, unknown>[] }));
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    insert: () => ({
      values: (row: Record<string, unknown>) => ({
        returning: async () => { db.inserted.push(row); return [{ id: "new-user" }]; },
        onConflictDoNothing: async () => { db.inserted.push(row); },
      }),
    }),
  }),
}));

function html(node: React.ReactNode) { return renderToStaticMarkup(node); }
function inputNamed(markup: string, name: string) { return markup.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0] ?? ""; }
function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

beforeEach(() => { action.error = undefined; params.values = {}; db.inserted = []; vi.stubGlobal("React", React); });

describe("D-36 server errors are announced and inputs marked invalid", () => {
  it.each([
    ["login", () => <LoginPage />, "login-error"],
    ["register", () => <RegisterPage />, "register-error"],
    ["forgot-password", () => <ForgotPasswordPage />, "forgot-error"],
  ])("%s renders role=alert with aria-invalid/aria-describedby on failure", (_name, page, id) => {
    expect(html(page())).not.toContain('role="alert"');
    action.error = "Invalid email or password";
    const markup = html(page());
    expect(markup).toContain(`<p id="${id}" role="alert"`);
    expect(markup).toContain("Invalid email or password");
    expect(inputNamed(markup, "email")).toContain('aria-invalid="true"');
    expect(inputNamed(markup, "email")).toContain(`aria-describedby="${id}"`);
  });
  it("reset-password marks both password fields invalid on failure", () => {
    params.values = { token: "abc" };
    action.error = "Passwords do not match";
    const markup = html(<ResetPasswordPage />);
    expect(markup).toContain('id="reset-error" role="alert"');
    expect(inputNamed(markup, "password")).toContain('aria-invalid="true"');
    expect(inputNamed(markup, "confirm")).toContain('aria-invalid="true"');
  });
});

describe("D-43 password show/hide toggle", () => {
  it("renders a non-submitting toggle button with a pressed state and accessible name", () => {
    const markup = html(<PasswordInput id="pw" name="password" />);
    expect(inputNamed(markup, "password")).toContain('type="password"');
    const toggle = markup.match(/<button[^>]*>/)?.[0] ?? "";
    expect(toggle).toContain('type="button"');
    expect(toggle).toContain('aria-pressed="false"');
    expect(toggle).toContain('aria-label="Show password"');
  });
  it("is used on login and register, and the password rule is visible on register", () => {
    expect(html(<LoginPage />)).toContain('aria-label="Show password"');
    const register = html(<RegisterPage />);
    expect(register).toContain('aria-label="Show password"');
    expect(register).toContain("At least 8 characters");
    expect(inputNamed(register, "password")).toContain('aria-describedby="password-rules"');
  });
});

describe("D-44 inline links are not colour-only", () => {
  it.each([
    ["login", () => <LoginPage />],
    ["register", () => <RegisterPage />],
    ["forgot-password", () => <ForgotPasswordPage />],
  ])("%s underlines every inline text link", (_name, page) => {
    const anchors = html(page()).match(/<a [^>]*>/g) ?? [];
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) expect(anchor).toMatch(/class="[^"]*\bunderline\b/);
  });
});

describe("D-41 register name is required, trimmed and bounded", () => {
  it("renders the name input as required with maxLength 100", () => {
    const input = inputNamed(html(<RegisterPage />), "name");
    expect(input).toContain("required");
    expect(input).toMatch(/maxlength="100"/i);
  });
  it("rejects a missing, whitespace-only or 600-character name server-side", async () => {
    const base = { email: "new@example.test", password: "password123" };
    expect(await registerAction(form(base))).toEqual({ error: "Enter your name" });
    expect(await registerAction(form({ ...base, name: "   " }))).toEqual({ error: "Enter your name" });
    expect(await registerAction(form({ ...base, name: "x".repeat(600) }))).toEqual({ error: expect.stringMatching(/100/) });
    expect(db.inserted).toHaveLength(0);
  });
  it("stores the trimmed name on success", async () => {
    await registerAction(form({ name: "  Alice  ", email: "new@example.test", password: "password123" })).catch(() => {});
    expect(db.inserted[0]).toMatchObject({ name: "Alice", email: "new@example.test" });
  });
});

describe("D-42 newsletter email validation", () => {
  it("rejects an over-long local part, a malformed address and an over-long address", async () => {
    const bad = ["x".repeat(300) + "@example.test", "not-an-email", "a@" + "b".repeat(250) + ".test"];
    for (const email of bad) expect(await subscribeAction(form({ email }))).toEqual({ error: "Please enter a valid email address." });
  });
  it("accepts and normalises a valid address", async () => {
    expect(await subscribeAction(form({ email: "  Reader@Example.test " }))).toEqual({ success: true });
    expect(db.inserted[0]).toMatchObject({ email: "reader@example.test" });
  });
});
