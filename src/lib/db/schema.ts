import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  date,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "done",
]);

export const constraintTypeEnum = pgEnum("constraint_type", [
  "time_budget",
  "energy_budget",
  "redline",
]);

export const scenarioModeEnum = pgEnum("scenario_mode", [
  "default",
  "exam",
  "chill",
  "newborn",
  "crisis",
  "long_distance",
  "custom",
]);

// ── Users ──────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  partnerId: uuid("partner_id"),
  partnerInviteCode: text("partner_invite_code").unique(),
  activeScenarioId: uuid("active_scenario_id"),
  subscriptionTier: text("subscription_tier").default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  alphaWeight: numeric("alpha_weight", { precision: 5, scale: 4 }).default(
    "0.5"
  ),
  betaWeight: numeric("beta_weight", { precision: 5, scale: 4 }).default(
    "0.5"
  ),
  pillarVitalityWeight: numeric("pillar_vitality_weight", {
    precision: 5,
    scale: 4,
  }).default("0.25"),
  pillarGrowthWeight: numeric("pillar_growth_weight", {
    precision: 5,
    scale: 4,
  }).default("0.25"),
  pillarSecurityWeight: numeric("pillar_security_weight", {
    precision: 5,
    scale: 4,
  }).default("0.25"),
  pillarConnectionWeight: numeric("pillar_connection_weight", {
    precision: 5,
    scale: 4,
  }).default("0.25"),
  relEmotionalWeight: numeric("rel_emotional_weight", {
    precision: 5,
    scale: 4,
  }).default("0.2"),
  relTrustWeight: numeric("rel_trust_weight", {
    precision: 5,
    scale: 4,
  }).default("0.2"),
  relFairnessWeight: numeric("rel_fairness_weight", {
    precision: 5,
    scale: 4,
  }).default("0.2"),
  relStressWeight: numeric("rel_stress_weight", {
    precision: 5,
    scale: 4,
  }).default("0.2"),
  relAutonomyWeight: numeric("rel_autonomy_weight", {
    precision: 5,
    scale: 4,
  }).default("0.2"),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastLogDate: date("last_log_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  referralCode: text("referral_code").unique(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Referrals ─────────────────────────────────────────────────────────────────

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey(),
  referrerId: uuid("referrer_id").notNull(),
  referredEmail: text("referred_email").notNull(),
  referredUserId: uuid("referred_user_id"),
  status: text("status").notNull().default("pending"), // pending, signed_up, rewarded
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
});

// ── Daily Logs ─────────────────────────────────────────────────────────────────

export const dailyLogs = pgTable("daily_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  vitalityScore: integer("vitality_score").notNull(),
  growthScore: integer("growth_score").notNull(),
  securityScore: integer("security_score").notNull(),
  connectionScore: integer("connection_score").notNull(),
  emotionalScore: integer("emotional_score").notNull(),
  trustScore: integer("trust_score").notNull(),
  fairnessScore: integer("fairness_score").notNull(),
  stressScore: integer("stress_score").notNull(),
  autonomyScore: integer("autonomy_score").notNull(),
  mood: integer("mood").notNull(),
  energyLevel: integer("energy_level").notNull(),
  notes: text("notes"),
  scenarioMode: text("scenario_mode"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Weekly Check-ins ───────────────────────────────────────────────────────────

export const weeklyCheckins = pgTable("weekly_checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  weekStart: date("week_start").notNull(),
  highlight: text("highlight"),
  challenge: text("challenge"),
  gratitude: text("gratitude"),
  partnerAppreciation: text("partner_appreciation"),
  overallSatisfaction: integer("overall_satisfaction").notNull(),
  weeklyGoals: jsonb("weekly_goals"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Scores ─────────────────────────────────────────────────────────────────────

export const scores = pgTable("scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  dailyLogId: uuid("daily_log_id")
    .notNull()
    .references(() => dailyLogs.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  lifeScore: numeric("life_score", { precision: 6, scale: 2 }).notNull(),
  relScore: numeric("rel_score", { precision: 6, scale: 2 }).notNull(),
  totalQuality: numeric("total_quality", { precision: 6, scale: 2 }).notNull(),
  penaltyApplied: numeric("penalty_applied", { precision: 6, scale: 2 }),
  constraintViolations: jsonb("constraint_violations"),
  weightsSnapshot: jsonb("weights_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Tasks ──────────────────────────────────────────────────────────────────────

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  coupleId: text("couple_id"),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: uuid("assignee_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: taskStatusEnum("status").notNull().default("pending"),
  recurrence: text("recurrence"),
  effortPoints: integer("effort_points").notNull(),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Constraints ────────────────────────────────────────────────────────────────

export const constraints = pgTable("constraints", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: constraintTypeEnum("type").notNull(),
  dimension: text("dimension"),
  minValue: numeric("min_value", { precision: 8, scale: 2 }),
  maxValue: numeric("max_value", { precision: 8, scale: 2 }),
  budgetHours: numeric("budget_hours", { precision: 6, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Scenario Profiles ──────────────────────────────────────────────────────────

export const scenarioProfiles = pgTable("scenario_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mode: scenarioModeEnum("mode").notNull().default("default"),
  description: text("description"),
  weightOverrides: jsonb("weight_overrides"),
  constraintOverrides: jsonb("constraint_overrides"),
  isPreset: boolean("is_preset").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Interventions ──────────────────────────────────────────────────────────────

export const interventions = pgTable("interventions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  theoryBasis: text("theory_basis"),
  targetDimension: text("target_dimension"),
  wasCompleted: boolean("was_completed").notNull().default(false),
  rating: integer("rating"),
  scoreBefore: numeric("score_before", { precision: 6, scale: 2 }),
  scoreAfter: numeric("score_after", { precision: 6, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Subscribers ───────────────────────────────────────────────────────────────

export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source").notNull(), // "blog", "footer", "quiz_result", "landing"
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
});

// ── Relations ──────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  partner: one(users, {
    fields: [users.partnerId],
    references: [users.id],
    relationName: "partner",
  }),
  activeScenario: one(scenarioProfiles, {
    fields: [users.activeScenarioId],
    references: [scenarioProfiles.id],
  }),
  dailyLogs: many(dailyLogs),
  weeklyCheckins: many(weeklyCheckins),
  scores: many(scores),
  assignedTasks: many(tasks, { relationName: "assignee" }),
  createdTasks: many(tasks, { relationName: "creator" }),
  constraints: many(constraints),
  scenarioProfiles: many(scenarioProfiles),
  interventions: many(interventions),
  referrals: many(referrals),
}));

export const dailyLogsRelations = relations(dailyLogs, ({ one, many }) => ({
  user: one(users, {
    fields: [dailyLogs.userId],
    references: [users.id],
  }),
  scores: many(scores),
}));

export const weeklyCheckinsRelations = relations(
  weeklyCheckins,
  ({ one }) => ({
    user: one(users, {
      fields: [weeklyCheckins.userId],
      references: [users.id],
    }),
  })
);

export const scoresRelations = relations(scores, ({ one }) => ({
  dailyLog: one(dailyLogs, {
    fields: [scores.dailyLogId],
    references: [dailyLogs.id],
  }),
  user: one(users, {
    fields: [scores.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: "assignee",
  }),
  creator: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: "creator",
  }),
}));

export const constraintsRelations = relations(constraints, ({ one }) => ({
  user: one(users, {
    fields: [constraints.userId],
    references: [users.id],
  }),
}));

export const scenarioProfilesRelations = relations(
  scenarioProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [scenarioProfiles.userId],
      references: [users.id],
    }),
  })
);

export const interventionsRelations = relations(interventions, ({ one }) => ({
  user: one(users, {
    fields: [interventions.userId],
    references: [users.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
  }),
}));
