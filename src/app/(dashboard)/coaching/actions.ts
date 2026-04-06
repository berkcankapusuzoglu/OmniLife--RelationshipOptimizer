"use server";

import { requireAuth } from "@/lib/auth/guard";
import { hasFeatureAccess } from "@/lib/auth/tier-gate";
import { getDb } from "@/lib/db";
import { coachingSessions } from "@/lib/db/schema";
import {
  buildCoachingContext,
  buildCoachingMessage,
  buildSystemPrompt,
} from "@/lib/coaching/prompt-builder";
import { eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

  // Load existing conversation history for context
  let existingMessages: CoachingMessage[] = [];
  if (sessionId) {
    const [session] = await db
      .select()
      .from(coachingSessions)
      .where(eq(coachingSessions.id, sessionId))
      .limit(1);
    if (session) {
      existingMessages = (session.messages as CoachingMessage[]) ?? [];
    }
  }

  // Build coaching response
  let replyContent: string;

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const context = await buildCoachingContext(user.id);
      const systemPrompt = buildSystemPrompt(context);

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: systemPrompt,
        generationConfig: { maxOutputTokens: 300 },
      });

      // Build history (last 10 turns, excluding current message)
      const history = existingMessages.slice(-10).map((m) => ({
        role: m.role === "user" ? "user" as const : "model" as const,
        parts: [{ text: m.content }],
      }));

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(userMessage);
      replyContent = result.response.text();
    } catch (err) {
      console.error("Gemini coaching error:", err);
      const context = await buildCoachingContext(user.id);
      replyContent = buildCoachingMessage(context);
    }
  } else {
    // Fallback: context-aware static response
    const context = await buildCoachingContext(user.id);
    replyContent = buildCoachingMessage(context);
  }

  const replyMsg: CoachingMessage = {
    role: "coach",
    content: replyContent,
    timestamp: new Date().toISOString(),
  };

  if (sessionId && existingMessages.length > 0) {
    existingMessages.push(newUserMsg, replyMsg);
    await db
      .update(coachingSessions)
      .set({ messages: existingMessages })
      .where(eq(coachingSessions.id, sessionId));
  } else if (sessionId) {
    // Session exists but was empty
    await db
      .update(coachingSessions)
      .set({ messages: [newUserMsg, replyMsg] })
      .where(eq(coachingSessions.id, sessionId));
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
