import { describe, expect, it } from "vitest";
import { MIGRATION_STATEMENTS, renderSql } from "../migrate-v1.1.0.mjs";

const RLS_TABLES = ["billing_events", "push_tokens", "coaching_usage"];

describe("migrate-v1.1.0 statements", () => {
  it("creates the three v1.1.0 tables before securing them", () => {
    for (const table of RLS_TABLES) {
      const create = MIGRATION_STATEMENTS.findIndex((s) => s.startsWith(`CREATE TABLE IF NOT EXISTS "${table}"`));
      const enable = MIGRATION_STATEMENTS.indexOf(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      expect(create).toBeGreaterThanOrEqual(0);
      expect(enable).toBeGreaterThan(create);
    }
  });

  it("enables RLS with an idempotent deny-all policy for anon/authenticated on each new table", () => {
    for (const table of RLS_TABLES) {
      const drop = MIGRATION_STATEMENTS.indexOf(`DROP POLICY IF EXISTS "Server only: deny all" ON "${table}"`);
      const create = MIGRATION_STATEMENTS.findIndex((s) => s.startsWith(`CREATE POLICY "Server only: deny all" ON "${table}"`));
      expect(drop).toBeGreaterThanOrEqual(0);
      expect(create).toBe(drop + 1);
      expect(MIGRATION_STATEMENTS[create]).toMatch(/TO anon, authenticated USING \(false\) WITH CHECK \(false\)$/);
    }
  });

  it("only contains additive or security statements", () => {
    for (const s of MIGRATION_STATEMENTS) expect(s).not.toMatch(/\b(DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|RENAME)\b/i);
    expect(MIGRATION_STATEMENTS).toHaveLength(17);
  });

  it("renders one terminated statement per entry", () => {
    expect(renderSql().split(";\n\n")).toHaveLength(MIGRATION_STATEMENTS.length);
  });
});
