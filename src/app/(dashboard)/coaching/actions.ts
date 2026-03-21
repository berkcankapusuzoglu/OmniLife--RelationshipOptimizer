"use server";

import { requireAuth } from "@/lib/auth/guard";
import { hasFeatureAccess } from "@/lib/auth/tier-gate";
import { getDb } from "@/lib/db";
import { coachingSessions } from "@/lib/db/schema";
import {
  buildCoachingContext,
  buildCoachingMessage,
} from "@/lib/coaching/prompt-builder";
import { eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { revalidatePath } from "next/cache";

export interface CoachingMessage {
  role: "user" | "coach";
  content: string;
  timestamp: string;
}

export async function sendCoachingMessage(
  sessionId: string | null,
  userMessage: string
): Promise<{
  error?: string;
  sessionId?: string;
  reply?: CoachingMessage;
}> {
  const user = await requireAuth();

  const access = await hasFeatureAccess(user.id, "aiCoaching");
  if (!access.allowed) {
    return {
      error: `AI Coaching requires the ${access.requiredTier} plan. Please upgrade to access this feature.`,
    };
  }

  const db = getDb();
  const now = new Date().toISOString();

  const newUserMsg: CoachingMessage = {
    role: "user",
    content: userMessage,
    timestamp: now,
  };

  // Build coaching response
  let replyContent: string;

  const aiApiKey = process.env.AI_COACHING_API_KEY;
  if (aiApiKey) {
    // Placeholder for future AI integration
    replyContent =
      "AI-powered coaching is coming soon! In the meantime, here's guidance based on your data.";
    const context = await buildCoachingContext(user.id);
    replyContent += "\n\n" + buildCoachingMessage(context);
  } else {
    // Generate a context-aware placeholder response
    const context = await buildCoachingContext(user.id);
    replyContent = buildCoachingMessage(context);
  }

  const replyMsg: CoachingMessage = {
    role: "coach",
    content: replyContent,
    timestamp: new Date().toISOString(),
  };

  if (sessionId) {
    // Fetch existing session and append messages
    const [session] = await db
      .select()
      .from(coachingSessions)
      .where(eq(coachingSessions.id, sessionId))
      .limit(1);

    if (session) {
      const messages = (session.messages as CoachingMessage[]) ?? [];
      messages.push(newUserMsg, replyMsg);
      await db
        .update(coachingSessions)
        .set({ messages })
        .where(eq(coachingSessions.id, sessionId));
    }
  } else {
    // Create new session
    sessionId = uuid();
    await db.insert(coachingSessions).values({
      id: sessionId,
      userId: user.id,
      messages: [newUserMsg, replyMsg],
    });
  }

  revalidatePath("/coaching");

  return { sessionId, reply: replyMsg };
}

export async function getRecentSession(): Promise<{
  sessionId: string | null;
  messages: CoachingMessage[];
}> {
  const user = await requireAuth();
  const db = getDb();

  const [session] = await db
    .select()
    .from(coachingSessions)
    .where(eq(coachingSessions.userId, user.id))
    .orderBy(desc(coachingSessions.createdAt))
    .limit(1);

  if (!session) {
    return { sessionId: null, messages: [] };
  }

  return {
    sessionId: session.id,
    messages: (session.messages as CoachingMessage[]) ?? [],
  };
}
