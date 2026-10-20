import { z } from "zod";

export const resourceId = z.uuid();
export const dimension = z.enum(["vitality", "growth", "security", "connection", "emotional", "trust", "fairness", "stress", "autonomy"]);
export const scenarioMode = z.enum(["default", "exam", "chill", "newborn", "crisis", "long_distance", "custom"]);
const text = z.string().max(10000);
const name = z.string().trim().min(1).max(200);
export const CONSTRAINT_NAME_MAX = 60;
const constraintName = z.string().trim().min(1, "Constraint name is required").max(CONSTRAINT_NAME_MAX, "Constraint name must be at most 60 characters");
const score = z.number().int().min(0).max(10);
export const assessmentInput = z.object({ vitality: score, growth: score, security: score, connection: score, emotional: score, trust: score, fairness: score, stress: score, autonomy: score });
export const dailyInput = assessmentInput.extend({ mood: score, energyLevel: score, notes: text });
export const weeklyInput = z.object({ highlight: text, challenge: text, gratitude: text, partnerAppreciation: text, overallSatisfaction: score, weeklyGoals: z.array(z.string().max(1000)).max(50) });
export const taskInput = z.object({ title: name, description: text.optional(), assigneeId: resourceId.optional(), effortPoints: z.number().int().min(1).max(13), dueDate: z.iso.date().optional(), recurrence: z.enum(["daily", "weekly", "monthly"]).optional() });
export const taskStatus = z.enum(["pending", "in_progress", "done"]);
export const exerciseInput = z.object({ exerciseId: name, title: name, theoryBasis: text, targetDimension: dimension, rating: z.number().int().min(1).max(5) });
export const constraintInput = z.object({ name: constraintName, type: z.enum(["time_budget", "energy_budget", "redline"]), dimension, minValue: z.number().finite().min(0).max(10).optional(), maxValue: z.number().finite().min(0).max(10).optional(), budgetHours: z.number().finite().min(0).max(24).optional() }).refine((c) => c.minValue === undefined || c.maxValue === undefined || c.minValue <= c.maxValue, "Minimum must not exceed maximum");
const weight = z.number().finite().min(0).max(1);
export const weightsInput = z.object({ alpha: weight, beta: weight, pillar: z.object({ vitality: weight, growth: weight, security: weight, connection: weight }), rel: z.object({ emotional: weight, trust: weight, fairness: weight, stress: weight, autonomy: weight }) });
export const profileName = name;
export const inviteInput = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/);
export const dayLimitInput = z.number().int().min(1).max(365);
export const onboardingInput = assessmentInput.extend({ relationshipStatus: z.enum(["In a relationship", "Married", "Engaged", "Dating", "Long-distance", "It's complicated", "Other"]), goals: z.array(z.enum(["Improve communication", "Build trust", "Increase emotional intimacy", "Better conflict resolution", "More quality time together", "Work-life balance", "Personal growth alongside partner", "Reduce stress in the relationship", "Strengthen autonomy"])).max(9), scenarioMode, constraints: z.array(constraintInput).max(50), partnerEmail: z.union([z.email(), z.literal("")]).optional() });

export function optionalFormNumber(value: FormDataEntryValue | null): number | undefined {
  if (value === null || value === "") return undefined;
  return typeof value === "string" ? Number(value) : NaN;
}
