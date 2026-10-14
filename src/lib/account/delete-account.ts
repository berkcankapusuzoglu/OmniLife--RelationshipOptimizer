import "server-only";
import { eq, like, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users, dailyLogs, weeklyCheckins, scores, tasks, constraints, scenarioProfiles, interventions, passwordResets, subscribers, referrals, partnerSyncEvents, coachingSessions } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe";

export class BillingDeletionError extends Error {
  constructor() {
    super("Billing cleanup could not finish. Your account and app data have not been deleted. Some subscriptions may already be canceled. Try again, or use Settings > Billing and contact support through the deletion page.");
  }
}

function isMissingStripeResource(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "resource_missing" && "statusCode" in error && error.statusCode === 404;
}

async function removeStripeAccount(customerId: string | null, subscriptionId: string | null) {
  if (!customerId && !subscriptionId) return;
  try {
    const stripe = getStripe();
    const canceled = new Set<string>();
    if (customerId) {
      try {
        // Iterate every page: a customer can have more than the stored subscription.
        for await (const subscription of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
          if (subscription.status !== "canceled" && subscription.status !== "incomplete_expired") {
            await stripe.subscriptions.cancel(subscription.id);
          }
          canceled.add(subscription.id);
        }
      } catch (error) {
        if (!isMissingStripeResource(error)) throw error;
      }
    }
    if (subscriptionId && !canceled.has(subscriptionId)) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.status !== "canceled" && subscription.status !== "incomplete_expired") {
          await stripe.subscriptions.cancel(subscriptionId);
        }
      } catch (error) {
        if (!isMissingStripeResource(error)) throw error;
      }
    }
    if (customerId) {
      try { await stripe.customers.del(customerId); }
      catch (error) { if (!isMissingStripeResource(error)) throw error; }
    }
  } catch {
    throw new BillingDeletionError();
  }
}

/** Delete active app data atomically; the surviving partner keeps their own data. */
export async function deleteAccount(userId: string): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1).for("update");
    if (!user) return;

    // External billing cannot roll back with PostgreSQL. Complete it first and
    // keep identifiers/data available for retry whenever the provider fails.
    await removeStripeAccount(user.stripeCustomerId, user.stripeSubscriptionId);

    // Match historical links as well as the current couple (including unlinked accounts).
    const relatedCouple = (column: typeof tasks.coupleId | typeof partnerSyncEvents.coupleId) =>
      or(like(column, `${userId}::%`), like(column, `%::${userId}`));

    await tx.update(users).set({ partnerId: null }).where(eq(users.partnerId, userId));
    await tx.delete(partnerSyncEvents).where(relatedCouple(partnerSyncEvents.coupleId));
    await tx.delete(referrals).where(or(eq(referrals.referrerId, userId), eq(referrals.referredUserId, userId), sql`lower(${referrals.referredEmail}) = ${user.email.toLowerCase()}`));
    await tx.delete(subscribers).where(sql`lower(${subscribers.email}) = ${user.email.toLowerCase()}`);
    await tx.delete(tasks).where(eq(tasks.createdById, userId));
    await tx.update(tasks).set({ assigneeId: null }).where(eq(tasks.assigneeId, userId));
    await tx.update(tasks).set({ coupleId: null }).where(relatedCouple(tasks.coupleId));
    await tx.delete(scores).where(eq(scores.userId, userId));
    await tx.delete(dailyLogs).where(eq(dailyLogs.userId, userId));
    await tx.delete(weeklyCheckins).where(eq(weeklyCheckins.userId, userId));
    await tx.delete(constraints).where(eq(constraints.userId, userId));
    await tx.delete(scenarioProfiles).where(eq(scenarioProfiles.userId, userId));
    await tx.delete(interventions).where(eq(interventions.userId, userId));
    await tx.delete(passwordResets).where(eq(passwordResets.userId, userId));
    await tx.delete(coachingSessions).where(eq(coachingSessions.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });
}
