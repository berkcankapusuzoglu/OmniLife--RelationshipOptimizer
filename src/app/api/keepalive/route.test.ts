import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const execute = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ getDb: () => ({ execute }) }));

function request(authorization?: string) {
  return new NextRequest("https://example.test/api/keepalive", {
    headers: authorization ? { authorization } : {},
  });
}

describe("keepalive scheduler boundary", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "scheduler-test-secret");
    execute.mockReset().mockResolvedValue([{ "?column?": 1 }]);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it.each([undefined, ""])("fails closed with missing/empty configuration: %s", async secret => {
    vi.stubEnv("CRON_SECRET", secret);
    const response = await GET(request("Bearer undefined"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Keepalive is not configured." });
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([undefined, "scheduler-test-secret", "bearer scheduler-test-secret", "Bearer wrong", "Bearer scheduler-test-secret extra"])("requires exact bearer authorization: %s", async authorization => {
    const response = await GET(request(authorization));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("accepts Vercel's bearer header and performs only a constant read", async () => {
    const response = await GET(request("Bearer scheduler-test-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(new PgDialect().sqlToQuery(execute.mock.calls[0][0])).toMatchObject({ sql: "select 1", params: [] });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns a generic failure without driver details in the response or logs", async () => {
    execute.mockRejectedValue(new Error("private driver connection detail"));
    const response = await GET(request("Bearer scheduler-test-secret"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Database check failed." });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private driver");
  });
});
