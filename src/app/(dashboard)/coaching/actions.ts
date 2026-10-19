"use server";

import { requireAuth } from "@/lib/auth/guard";
import { getUserTier } from "@/lib/subscription/access";
import { getDb } from "@/lib/db";
import { coachingSessions } from "@/lib/db/schema";
import {
  buildCoachingContext,
  buildSystemPrompt,
} from "@/lib/coaching/prompt-builder";
import {
  coachingModel,
  coachingQuotaForTier,
  consumeCoachingQuota,
  refundCoachingQuota,
  todayUtc,
} from "@/lib/coaching/quota";
import { and, eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resourceId } from "@/lib/auth/action-inputs";
import { z } from "zod";

export interface CoachingMessage {
  role: "user" | "coach";
  content: string;
  timestamp: string;
}

const MAX_MESSAGE_CHARS = 2000;
const HISTORY_TURNS = 6;
const MAX_OUTPUT_TOKENS = 400;

const COACH_UNAVAILABLE =
  "The coach is unavailable right now. Nothing was charged against your daily limit.";

export async function sendCoachingMessage(
  sessionId: string | null,
  userMessage: string
): Promise<{
  error?: string;
  sessionId?: string;
  reply?: CoachingMessage;
}> {
  const user = await requireAuth();
  if (sessionId !== null) sessionId = resourceId.parse(sessionId);
  userMessage = z.string().trim().min(1).max(MAX_MESSAGE_CHARS).parse(userMessage);

  const tier = await getUserTier(user.id);
  const limit = coachingQuotaForTier(tier);
  if (limit <= 0) {
    return {
      error: "AI Coaching requires the premium plan. Please upgrade to access this feature.",
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
      .where(and(eq(coachingSessions.id, sessionId), eq(coachingSessions.userId, user.id)))
      .limit(1);
    if (!session) return { error: "Conversation unavailable" };
    existingMessages = (session.messages as CoachingMessage[]) ?? [];
  }

  // Reserve one message of today's quota before calling the provider.
  const day = todayUtc();
  const quota = await consumeCoachingQuota(user.id, limit, day);
  if (!quota.allowed) {
    return {
      error: `You've used today's ${quota.limit} coaching messages. Resets at midnight UTC.`,
    };
  }

  // Build coaching response. No static fallback: if the provider cannot
  // answer, say so and give the reserved message back.
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    await refundCoachingQuota(user.id, day);
    return { error: COACH_UNAVAILABLE };
  }

  let replyContent: string;
  try {
    const context = await buildCoachingContext(user.id);
    const systemPrompt = buildSystemPrompt(context);

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: coachingModel(),
      systemInstruction: systemPrompt,
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
    });

    // Build history (last 6 turns, excluding current message)
    const history = existingMessages.slice(-HISTORY_TURNS).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userMessage);
    replyContent = result.response.text();
  } catch (err) {
    console.error("Gemini coaching error:", err);
    await refundCoachingQuota(user.id, day);
    return { error: COACH_UNAVAILABLE };
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
      .where(and(eq(coachingSessions.id, sessionId), eq(coachingSessions.userId, user.id)));
  } else if (sessionId) {
    // Session exists but was empty
    await db
      .update(coachingSessions)
      .set({ messages: [newUserMsg, replyMsg] })
      .where(and(eq(coachingSessions.id, sessionId), eq(coachingSessions.userId, user.id)));
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
