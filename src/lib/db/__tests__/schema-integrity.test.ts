import { describe, it, expect } from 'vitest';
import * as schema from '@/lib/db/schema';

/**
 * Lightweight checks that all expected table exports exist and look like
 * real Drizzle table objects. No DB connection is made — this purely
 * validates that the schema module exports what the rest of the app depends on.
 */

const EXPECTED_TABLES = [
  'users',
  'dailyLogs',
  'scores',
  'weeklyCheckins',
  'tasks',
  'constraints',
  'scenarioProfiles',
  'interventions',
  'referrals',
  'subscribers',
  'passwordResets',
] as const;

function isDrizzleTable(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  // Drizzle tables use Symbol-keyed metadata. Detect by checking for known symbols.
  const syms = Object.getOwnPropertySymbols(value);
  const symStrings = syms.map((s) => String(s));
  return (
    symStrings.includes('Symbol(drizzle:IsDrizzleTable)') ||
    symStrings.includes('Symbol(drizzle:Name)')
  );
}

describe('schema integrity', () => {
  for (const tableName of EXPECTED_TABLES) {
    it(`exports a real Drizzle table: ${tableName}`, () => {
      const exported = (schema as Record<string, unknown>)[tableName];
      expect(exported, `${tableName} is not exported from schema`).toBeDefined();
      expect(
        isDrizzleTable(exported),
        `${tableName} does not look like a Drizzle table (missing _?.name)`,
      ).toBe(true);
    });
  }

  it('passwordResets table has the expected columns (token, userId, expiresAt, usedAt)', () => {
    // Drizzle exposes columns as own enumerable properties on the table object
    const cols = Object.keys(schema.passwordResets);
    expect(cols).toContain('token');
    expect(cols).toContain('userId');
    expect(cols).toContain('expiresAt');
    expect(cols).toContain('usedAt');
  });

  it('users table has the passwordHash column (not plain "password")', () => {
    const cols = Object.keys(schema.users);
    expect(cols).toContain('passwordHash');
    expect(cols).not.toContain('password');
  });

  it('users table has onboardingCompleted column (infinite-redirect guard)', () => {
    const cols = Object.keys(schema.users);
    expect(cols).toContain('onboardingCompleted');
  });
});
