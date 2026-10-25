import { beforeEach, describe, expect, it, vi } from "vitest";

// The fake db answers in call order: referrer lookup, duplicate-row lookup,
// rewarded rows for the referrer. Drizzle predicates are opaque to the fake.
const mocks = vi.hoisted(() => ({
  selectQueue: [] as unknown[][],
  claimed: [] as unknown[],
  inserts: [] as unknown[],
  userUpdates: [] as Record<string, unknown>[],
  claims: 0,
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => {
          const rows = mocks.selectQueue.shift() ?? [];
          return Object.assign(Promise.resolve(rows), { limit: async () => rows });
        },
      }),
    }),
    insert: () => ({
      values: (row: unknown) => {
        mocks.inserts.push(row);
        return { returning: async () => [row] };
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          if (values.status === "rewarded") {
            mocks.claims += 1;
            // Only the first claim of a row can observe status = 'signed_up'.
            const rows = mocks.claims === 1 ? mocks.claimed : [];
            return { returning: async () => rows };
          }
          mocks.userUpdates.push(values);
          return Promise.resolve([]);
        },
      }),
    }),
  }),
}));

import { processReferral } from "..";

const referrer = { id: "referrer-1" };

// The grant is a SQL expression (`... + make_interval(days => $n)`), so the
// number of days it adds is the one numeric bind parameter in it.
function grantedDays(): number {
  expect(mocks.userUpdates).toHaveLength(1);
  const expr = mocks.userUpdates[0].trialEndsAt as {
    queryChunks?: unknown[];
  };
  const days = (expr.queryChunks ?? []).filter(
    (chunk): chunk is number => typeof chunk === "number"
  );
  expect(days).toHaveLength(1);
  return days[0];
}

function rewardedRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `referral-${i + 1}` }));
}

describe("processReferral", () => {
  beforeEach(() => {
    mocks.inserts = [];
    mocks.userUpdates = [];
    mocks.claims = 0;
    mocks.claimed = [{ id: "referral-1" }];
    mocks.selectQueue = [];
  });

  it("records the referral, claims it, and extends the referrer's trial", async () => {
    mocks.selectQueue = [[referrer], [], rewardedRows(1)];
    await processReferral("CODE", "new-user", "new@example.test");

    expect(mocks.inserts).toHaveLength(1);
    expect(grantedDays()).toBe(30);
  });

  it("grants the bonus month on the fifth rewarded referral", async () => {
    mocks.selectQueue = [[referrer], [], rewardedRows(5)];
    await processReferral("CODE", "new-user", "new@example.test");
    expect(grantedDays()).toBe(60);
  });

  it("does not reward when the claim finds the row already rewarded", async () => {
    mocks.selectQueue = [[referrer], [], rewardedRows(1)];
    mocks.claimed = [];
    await processReferral("CODE", "new-user", "new@example.test");
    expect(mocks.userUpdates).toHaveLength(0);
  });

  it("ignores a repeated signup for the same referrer and user", async () => {
    mocks.selectQueue = [[referrer], [{ id: "referral-1" }]];
    await processReferral("CODE", "new-user", "new@example.test");
    expect(mocks.inserts).toHaveLength(0);
    expect(mocks.userUpdates).toHaveLength(0);
  });

  it("refuses an unknown code", async () => {
    mocks.selectQueue = [[]];
    await processReferral("CODE", "new-user", "new@example.test");
    expect(mocks.inserts).toHaveLength(0);
    expect(mocks.userUpdates).toHaveLength(0);
  });

  it("refuses self-referral", async () => {
    mocks.selectQueue = [[{ id: "new-user" }]];
    await processReferral("CODE", "new-user", "new@example.test");
    expect(mocks.inserts).toHaveLength(0);
    expect(mocks.userUpdates).toHaveLength(0);
  });
});
