CREATE TYPE "public"."constraint_type" AS ENUM('time_budget', 'energy_budget', 'redline');--> statement-breakpoint
CREATE TYPE "public"."scenario_mode" AS ENUM('default', 'exam', 'chill', 'newborn', 'crisis', 'long_distance', 'custom');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "constraints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "constraint_type" NOT NULL,
	"dimension" text,
	"min_value" numeric(8, 2),
	"max_value" numeric(8, 2),
	"budget_hours" numeric(6, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"vitality_score" integer NOT NULL,
	"growth_score" integer NOT NULL,
	"security_score" integer NOT NULL,
	"connection_score" integer NOT NULL,
	"emotional_score" integer NOT NULL,
	"trust_score" integer NOT NULL,
	"fairness_score" integer NOT NULL,
	"stress_score" integer NOT NULL,
	"autonomy_score" integer NOT NULL,
	"mood" integer NOT NULL,
	"energy_level" integer NOT NULL,
	"notes" text,
	"scenario_mode" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interventions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"theory_basis" text,
	"target_dimension" text,
	"was_completed" boolean DEFAULT false NOT NULL,
	"rating" integer,
	"score_before" numeric(6, 2),
	"score_after" numeric(6, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referred_email" text NOT NULL,
	"referred_user_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"converted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scenario_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mode" "scenario_mode" DEFAULT 'default' NOT NULL,
	"description" text,
	"weight_overrides" jsonb,
	"constraint_overrides" jsonb,
	"is_preset" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_log_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"life_score" numeric(6, 2) NOT NULL,
	"rel_score" numeric(6, 2) NOT NULL,
	"total_quality" numeric(6, 2) NOT NULL,
	"penalty_applied" numeric(6, 2),
	"constraint_violations" jsonb,
	"weights_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now(),
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"couple_id" text,
	"title" text NOT NULL,
	"description" text,
	"assignee_id" uuid,
	"created_by_id" uuid NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"recurrence" text,
	"effort_points" integer NOT NULL,
	"due_date" date,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text NOT NULL,
	"partner_id" uuid,
	"partner_invite_code" text,
	"active_scenario_id" uuid,
	"subscription_tier" text DEFAULT 'free',
	"subscription_expires_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"alpha_weight" numeric(5, 4) DEFAULT '0.5',
	"beta_weight" numeric(5, 4) DEFAULT '0.5',
	"pillar_vitality_weight" numeric(5, 4) DEFAULT '0.25',
	"pillar_growth_weight" numeric(5, 4) DEFAULT '0.25',
	"pillar_security_weight" numeric(5, 4) DEFAULT '0.25',
	"pillar_connection_weight" numeric(5, 4) DEFAULT '0.25',
	"rel_emotional_weight" numeric(5, 4) DEFAULT '0.2',
	"rel_trust_weight" numeric(5, 4) DEFAULT '0.2',
	"rel_fairness_weight" numeric(5, 4) DEFAULT '0.2',
	"rel_stress_weight" numeric(5, 4) DEFAULT '0.2',
	"rel_autonomy_weight" numeric(5, 4) DEFAULT '0.2',
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_log_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"referral_code" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_partner_invite_code_unique" UNIQUE("partner_invite_code"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "weekly_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"highlight" text,
	"challenge" text,
	"gratitude" text,
	"partner_appreciation" text,
	"overall_satisfaction" integer NOT NULL,
	"weekly_goals" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "constraints" ADD CONSTRAINT "constraints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_profiles" ADD CONSTRAINT "scenario_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_daily_log_id_daily_logs_id_fk" FOREIGN KEY ("daily_log_id") REFERENCES "public"."daily_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_checkins" ADD CONSTRAINT "weekly_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;