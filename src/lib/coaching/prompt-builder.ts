import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dailyLogs, scores, interventions, constraints } from "@/lib/db/schema";

interface ScoreSummary {
  lifeScore: number;
  relScore: number;
  totalQuality: number;
}

interface DimensionState {
  dimension: string;
  value: number;
  status: "low" | "moderate" | "high";
}

export interface CoachingContext {
  latestScores: ScoreSummary | null;
  dimensions: DimensionState[];
  recentTrend: "improving" | "declining" | "stable";
  constraintViolations: string[];
  recentExercises: string[];
}

function getStatus(value: number): "low" | "moderate" | "high" {
  if (value <= 3) return "low";
  if (value <= 6) return "moderate";
  return "high";
}

function determineTrend(scoreValues: number[]): "improving" | "declining" | "stable" {
  if (scoreValues.length < 2) return "stable";
  const recent = scoreValues.slice(-3);
  const earlier = scoreValues.slice(0, -3);
  if (earlier.length === 0) return "stable";
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgEarlier = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const diff = avgRecent - avgEarlier;
  if (diff > 2) return "improving";
  if (diff < -2) return "declining";
  return "stable";
}

export async function buildCoachingContext(
  userId: string
): Promise<CoachingContext> {
  const db = getDb();

  const [recentLogs, recentScores, recentExercises] = await Promise.all([
    db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, userId))
      .orderBy(desc(dailyLogs.date))
      .limit(7),
    db
      .select()
      .from(scores)
      .where(eq(scores.userId, userId))
      .orderBy(desc(scores.date))
      .limit(7),
    db
      .select()
      .from(interventions)
      .where(eq(interventions.userId, userId))
      .orderBy(desc(interventions.createdAt))
      .limit(5),
  ]);

  const latestLog = recentLogs[0] ?? null;
  const latestScore = recentScores[0] ?? null;

  const latestScores: ScoreSummary | null = latestScore
    ? {
        lifeScore: Number(latestScore.lifeScore),
        relScore: Number(latestScore.relScore),
        totalQuality: Number(latestScore.totalQuality),
      }
    : null;

  const dimensions: DimensionState[] = latestLog
    ? [
        { dimension: "vitality", value: latestLog.vitalityScore, status: getStatus(latestLog.vitalityScore) },
        { dimension: "growth", value: latestLog.growthScore, status: getStatus(latestLog.growthScore) },
        { dimension: "security", value: latestLog.securityScore, status: getStatus(latestLog.securityScore) },
        { dimension: "connection", value: latestLog.connectionScore, status: getStatus(latestLog.connectionScore) },
        { dimension: "emotional", value: latestLog.emotionalScore, status: getStatus(latestLog.emotionalScore) },
        { dimension: "trust", value: latestLog.trustScore, status: getStatus(latestLog.trustScore) },
        { dimension: "fairness", value: latestLog.fairnessScore, status: getStatus(latestLog.fairnessScore) },
        { dimension: "stress", value: latestLog.stressScore, status: getStatus(latestLog.stressScore) },
        { dimension: "autonomy", value: latestLog.autonomyScore, status: getStatus(latestLog.autonomyScore) },
      ]
    : [];

  // Determine trend from recent total quality scores
  const totalQualities = recentScores
    .map((s) => Number(s.totalQuality))
    .reverse(); // chronological order
  const recentTrend = determineTrend(totalQualities);

  // Gather constraint violations from latest score
  const violationNames: string[] = [];
  if (latestScore?.constraintViolations) {
    const violations = latestScore.constraintViolations as Array<{
      constraintName: string;
    }>;
    for (const v of violations) {
      violationNames.push(v.constraintName);
    }
  }

  const exerciseNames = recentExercises.map((e) => e.title);

  return {
    latestScores,
    dimensions,
    recentTrend,
    constraintViolations: violationNames,
    recentExercises: exerciseNames,
  };
}

/**
 * Builds the system prompt for Gemini with real user context injected.
 */
export function buildSystemPrompt(context: CoachingContext): string {
  const scoresSummary = context.latestScores
    ? `Life Score: ${context.latestScores.lifeScore.toFixed(1)}/100, Relationship Score: ${context.latestScores.relScore.toFixed(1)}/100, Overall Quality: ${context.latestScores.totalQuality.toFixed(1)}/100`
    : "No scores yet — user hasn't logged any data.";

  const dimsSummary = context.dimensions.length > 0
    ? context.dimensions.map((d) => `${d.dimension}: ${d.value}/10 (${d.status})`).join(", ")
    : "No dimension data yet.";

  const lowDims = context.dimensions.filter((d) => d.status === "low").map((d) => d.dimension);

  return `You are a warm, evidence-based relationship and life coach inside the OmniLife app. You help users improve their well-being and relationship quality through data-driven insights and practical advice.

USER'S CURRENT DATA:
- Scores: ${scoresSummary}
- Trend: ${context.recentTrend}
- Dimensions: ${dimsSummary}
${lowDims.length > 0 ? `- Needs attention: ${lowDims.join(", ")}` : ""}
${context.constraintViolations.length > 0 ? `- Active violations: ${context.constraintViolations.join(", ")}` : ""}
${context.recentExercises.length > 0 ? `- Recent exercises: ${context.recentExercises.join(", ")}` : ""}

GUIDELINES:
- Be warm, empathetic, and concise (under 200 words per response)
- Reference their actual scores and dimensions when relevant
- Give 1-2 concrete, actionable suggestions per message
- Never diagnose, give medical advice, or assess their partner's mental state
- If the user seems distressed, acknowledge feelings first before advice
- If they mention crisis or self-harm, respond with: "I hear you. Please reach out to a crisis line — in the US: 988 Lifeline (call/text 988)."`;
}

/**
 * Builds a coaching message from the user's context data.
 * Used as a fallback when no AI API key is configured.
 */
export function buildCoachingMessage(context: CoachingContext): string {
  if (!context.latestScores) {
    return (
      "Welcome to AI Coaching! I don't have any score data from you yet. " +
      "Start by completing your first daily log so I can provide personalized guidance. " +
      "Once you log a few days, I'll be able to identify patterns, suggest exercises, " +
      "and help you work on specific relationship dimensions."
    );
  }

  const parts: string[] = [];

  // Overall status
  const tq = context.latestScores.totalQuality;
  if (tq >= 75) {
    parts.push(
      `Great work! Your Total Quality score is ${tq.toFixed(1)}, which indicates a strong balance between your life and relationship dimensions.`
    );
  } else if (tq >= 50) {
    parts.push(
      `Your Total Quality score is ${tq.toFixed(1)}. There's solid progress here, but room for growth in some areas.`
    );
  } else {
    parts.push(
      `Your Total Quality score is ${tq.toFixed(1)}. Let's focus on building up some key dimensions to improve your overall well-being.`
    );
  }

  // Trend
  if (context.recentTrend === "improving") {
    parts.push("Your scores have been trending upward recently — keep it up!");
  } else if (context.recentTrend === "declining") {
    parts.push(
      "I notice your scores have been declining lately. Let's identify what might be causing this and work on it together."
    );
  }

  // Low dimensions
  const lowDims = context.dimensions.filter((d) => d.status === "low");
  if (lowDims.length > 0) {
    const dimNames = lowDims.map((d) => d.dimension).join(", ");
    parts.push(
      `Your lowest dimensions are: ${dimNames}. Consider focusing exercises and daily intentions on these areas.`
    );
  }

  // Constraint violations
  if (context.constraintViolations.length > 0) {
    parts.push(
      `You currently have active constraint violations: ${context.constraintViolations.join(", ")}. Addressing these will reduce score penalties.`
    );
  }

  // Recent exercises
  if (context.recentExercises.length > 0) {
    parts.push(
      `Recently you've worked on: ${context.recentExercises.join(", ")}. Great job staying engaged with the exercises!`
    );
  } else {
    parts.push(
      "Consider trying some connection exercises — they can meaningfully boost your relationship dimensions."
    );
  }

  // Suggestion
  if (lowDims.length > 0) {
    const primary = lowDims[0];
    const suggestions: Record<string, string> = {
      vitality:
        "Try incorporating a brief physical activity or mindfulness exercise into your routine today.",
      growth:
        "Set a small learning goal for this week — even 15 minutes of personal development counts.",
      security:
        "Focus on one area that feels uncertain and take a small concrete step toward stability.",
      connection:
        "Reach out to someone important to you today, even with a brief message.",
      emotional:
        "Practice naming your emotions today. Emotional awareness is the first step to emotional connection.",
      trust:
        "Share something vulnerable with your partner, or follow through on a small promise.",
      fairness:
        "Discuss task distribution with your partner. Perceived fairness is crucial for relationship satisfaction.",
      stress:
        "Identify your top stressor and brainstorm one small action to reduce its impact.",
      autonomy:
        "Make time for a personal interest or hobby today — healthy relationships need individual space.",
    };
    const suggestion =
      suggestions[primary.dimension] ??
      "Focus on bringing intentional attention to your relationship today.";
    parts.push(`Suggestion: ${suggestion}`);
  }

  return parts.join("\n\n");
}
