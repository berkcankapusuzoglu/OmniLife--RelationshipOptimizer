import { readFileSync } from "node:fs";
import { rootCertificates } from "node:tls";
import { describe, expect, it } from "vitest";
import postgres from "postgres";
import { databaseConnectionOptions } from "../connection-options.mjs";

describe("databaseConnectionOptions", () => {
  it("requires certificate verification and uses the fixed pooler options", () => {
    expect(databaseConnectionOptions()).toEqual({
      prepare: false,
      max: 1,
      connect_timeout: 10,
      ssl: { rejectUnauthorized: true },
    });
  });

  it("passes an explicit CA as PEM while retaining strict verification", () => {
    const ca = rootCertificates[0];
    expect(databaseConnectionOptions(ca)).toEqual({
      prepare: false,
      max: 1,
      connect_timeout: 10,
      ssl: { rejectUnauthorized: true, ca },
    });
  });

  it.each(["", "C:/certs/ca.crt", "-----BEGIN CERTIFICATE-----\nnot a cert\n-----END CERTIFICATE-----"])(
    "rejects malformed explicit CA input (%s) with a static error",
    (ca) => {
      expect(() => databaseConnectionOptions(ca)).toThrow("Invalid DATABASE_SSL_CA configuration");
    },
  );

  it("keeps strict TLS despite sslmode=disable in the URL, without connecting", () => {
    const sql = postgres("postgres://user:pass@localhost/db?sslmode=disable", databaseConnectionOptions());
    expect(sql.options.ssl).toEqual({ rejectUnauthorized: true });
    expect(sql.options.max).toBe(1);
    expect(sql.options.prepare).toBe(false);
    expect(sql.options.connect_timeout).toBe(10);
    void sql.end({ timeout: 0 });
  });

  it("is used by both runtime and migration command with server-only CA configuration", () => {
    const runtime = readFileSync(new URL("../index.ts", import.meta.url), "utf8");
    const migration = readFileSync(new URL("../../../../scripts/migrate-add-subscription-source.mjs", import.meta.url), "utf8");
    expect(runtime).toContain("databaseConnectionOptions(process.env.DATABASE_SSL_CA)");
    expect(migration).toContain("databaseConnectionOptions(process.env.DATABASE_SSL_CA)");
  });
});
