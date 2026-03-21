import { requireAuth } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { constraints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ConstraintsClient } from "./constraints-client";
import { getUserTier } from "@/lib/subscription/access";

export default async function ConstraintsPage() {
  const user = await requireAuth();
  const userTier = await getUserTier(user.id);
  const db = getDb();

  const userConstraints = await db
    .select()
    .from(constraints)
    .where(eq(constraints.userId, user.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Constraints</h1>
        <p className="text-sm text-muted-foreground">
          Set redlines, time budgets, and energy limits
        </p>
      </div>
      <ConstraintsClient
        userTier={userTier}
        constraints={userConstraints.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type as "time_budget" | "energy_budget" | "redline",
          dimension: c.dimension ?? "",
          minValue: c.minValue ? Number(c.minValue) : undefined,
          maxValue: c.maxValue ? Number(c.maxValue) : undefined,
          budgetHours: c.budgetHours ? Number(c.budgetHours) : undefined,
          isActive: c.isActive,
        }))}
        userId={user.id}
      />
    </div>
  );
}
