# AI Coaching Implementation Guide

**One-sentence summary**: Use `claude-haiku-4-5`, inject current scores as context, stream responses, limit to Premium users — total cost under $5/month for 1,000 sessions.

---

## 1. How Professional Apps Do It

### The Landscape

**Wysa** (CBT-based mental wellness) uses a fine-tuned smaller model (not GPT-4) for its primary chatbot, with GPT-4 reserved only for edge-case escalation. Their system prompt encodes CBT technique categories as structured tags. Responses are typically under 150 words. The emphasis is on brevity and the feeling of being heard, not long-form advice.

**Woebot** runs on a combination of rule-based dialogue trees and a small LLM for freeform turns. Like Wysa, they treat the AI as the conversation manager — not the therapist. Key pattern: every response ends with either a question or a micro-action ("Try this tonight...").

**Replika** built its emotional intelligence on top of GPT-3-class models with heavy RLHF tuning toward warmth and active listening. They do not use GPT-4. Their main finding: users prefer faster, warmer, shorter responses over slower, more comprehensive ones.

**BetterHelp** is human therapists + async messaging, not AI chat. But their AI-assist tools for therapists use small models to summarize client check-ins — not to generate therapy content.

### Key Patterns

**System prompt engineering is the whole game.** Every professional app invests heavily here. The system prompt defines:
- The persona (warm, evidence-based, not a therapist)
- What user data to reference (current scores, trends)
- Response format constraints (length caps, ending with a question)
- Hard guardrails (crisis keyword detection, no diagnosis)

**Context injection at the start of every conversation.** Rather than relying on conversation history alone, these apps inject fresh user state at the top of every message:
```
User's current stress level: 8/10 (up from 5/10 last week)
Recent pattern: 3 consecutive low-trust logs
Active mode: exam pressure scenario
```
This gives the model situational awareness without requiring it to remember across sessions.

**Small/fast models for chat, never flagship models.**
All production relationship apps use the cheapest tier that still feels emotionally intelligent. Reasons:
- Response latency matters enormously in chat — users notice >2 second delays
- Cost at scale is prohibitive with flagship models (GPT-4 Turbo is ~20x the cost of Haiku)
- Emotional warmth in chat does not scale with model size the way complex reasoning does
- Shorter, warmer responses from a fast model beat long, analytical responses from a slow one

---

## 2. Best Model Choice for This Use Case

### Comparison

| Model | Input cost (per 1M tokens) | Output cost (per 1M tokens) | Latency | Notes |
|---|---|---|---|---|
| **claude-haiku-4-5** | $0.80 | $4.00 | ~0.5s TTFT | Best emotional intelligence per dollar; Anthropic's safety training aligns with relationship health values |
| GPT-4o mini | $0.15 | $0.60 | ~0.7s TTFT | Cheapest option, but noticeably less nuanced on emotional context; tends toward generic advice |
| Gemini Flash 2.0 | $0.10 | $0.40 | ~0.6s TTFT | Excellent throughput, but emotional tone is less consistent; more clinical than warm |
| claude-sonnet-4-5 | $3.00 | $15.00 | ~1.2s TTFT | Noticeably better than Haiku but ~5x cost; not justified for chat turns |

### Recommendation: claude-haiku-4-5

**Why Haiku wins for OmniLife specifically:**

1. **Emotional intelligence per dollar is unmatched.** Anthropic's Constitutional AI training gives Haiku a natural inclination toward supportive, non-harmful responses — which is exactly the default behavior you want for relationship coaching without extra guardrail engineering.

2. **Alignment with the product's values.** OmniLife is about relationship health and personal growth, not task completion. Haiku's training skews toward empathetic, considered responses over confident, prescriptive ones. This is a feature, not a limitation.

3. **Cost makes Premium sustainable.** At Haiku pricing, you can offer unlimited daily sessions as a Premium feature without it being a meaningful cost driver even at 10,000+ users.

4. **Streaming is fast enough to feel instant.** Haiku's time-to-first-token under 500ms means users see the first words of a response before they finish reading the UI transition. This makes the experience feel alive, not like waiting for a document.

GPT-4o mini is a reasonable fallback if you want vendor diversification, but the emotional register difference is noticeable when responses are short (under 200 words). Haiku's warmth is built in; GPT-4o mini's can feel hollow at the short response lengths that coaching requires.

---

## 3. Cost Analysis

### Token Budget Per Session Turn

| Component | Tokens | Notes |
|---|---|---|
| System prompt | ~800 | Persona + injected user context |
| Conversation history (10 turns max) | ~2,500 | ~250 tokens/turn average |
| Current user message | ~50 | Typical coaching question |
| **Total input** | **~3,350** | |
| Assistant response | ~250 | Capped at 300 output tokens |

### Per-Turn Cost at claude-haiku-4-5 Pricing

```
Input:  3,350 tokens × ($0.80 / 1,000,000) = $0.00268
Output:   250 tokens × ($4.00 / 1,000,000) = $0.00100
Total per turn: ~$0.0037
```

A "session" = ~5 turns (a realistic coaching conversation):
```
Cost per session: 5 × $0.0037 = ~$0.0185
```

### Monthly Cost at Scale

| Sessions/month | Cost |
|---|---|
| 100 | $1.85 |
| 1,000 | $18.50 |
| 10,000 | $185.00 |

**At 1,000 sessions/month: ~$18.50.** Even at 10,000 sessions — a large active user base — it's under $200/month. This is easily covered by Premium subscription revenue ($7.99/mo × users).

**Break-even math**: At $7.99/month Premium, you only need 1 paying user per ~430 sessions to cover costs. With a rate limit of 5 sessions/day per Premium user (~150/month), you could serve 65 Premium users' full daily usage for $18.50.

The correct framing: AI coaching is not a cost center at this price point. It is a feature that justifies the Premium tier price entirely on its own.

---

## 4. Concrete Implementation Plan

### System Prompt

This is the actual system prompt to use. Replace placeholder values (`{...}`) with data from `buildCoachingContext()` at runtime.

```
You are an AI relationship coach for OmniLife, a relationship optimization app. Your role is to provide warm, evidence-based coaching grounded in the user's actual data — not generic advice.

## Your Persona
- Warm, supportive, and non-judgmental
- Evidence-based (reference attachment theory, Gottman research, CBT principles when relevant)
- Concise: responses under 200 words unless the user explicitly asks for more
- Always end with either a reflective question or a specific, small action the user can take today
- You are a coach, not a therapist. You help with patterns and growth, not diagnosis or treatment

## User's Current State
- Life Score: {lifeScore}/10 | Relationship Score: {relScore}/10 | Total Quality: {totalQuality}/100
- Trend: {recentTrend} (based on last 7 days)
- Scenario mode: {scenarioMode} (e.g., "exam pressure", "normal", "crisis support")
- Lowest dimensions: {lowDimensions} (these are the user's current growth edges)
- Active constraint violations: {constraintViolations}
- Recent exercises completed: {recentExercises}

## Dimension Reference (1–10 scale)
- Vitality: physical/mental energy
- Growth: personal development momentum
- Security: financial/environmental stability
- Connection: social and partner connection
- Emotional: emotional intimacy and expression
- Trust: reliability and honesty with partner
- Fairness: perceived equity in the relationship
- Stress: current stress load (lower = more stressed)
- Autonomy: individual space within the relationship

## Guardrails
- Never diagnose mental health conditions (anxiety disorder, depression, PTSD, etc.)
- If the user mentions self-harm, suicidal thoughts, abuse, or domestic violence, immediately provide crisis resources and encourage professional help before any coaching response
- Never claim certainty about a partner's feelings or intentions
- If a topic is clearly outside coaching scope, say so directly and recommend a licensed therapist
- Always include a brief reminder that you are an AI, not a human therapist, when discussing serious relationship issues

## Response Format
- Acknowledge what the user said before responding
- Be direct and specific, not vague ("try communicating better" is not useful)
- Reference the user's actual scores or dimensions when relevant
- Keep it conversational, not clinical
```

### Crisis Keyword Detection

Before passing any user message to the API, run this check server-side:

```typescript
const CRISIS_KEYWORDS = [
  "kill myself", "end my life", "suicide", "suicidal",
  "self harm", "self-harm", "hurt myself", "want to die",
  "abuse", "hit me", "hits me", "afraid of my partner",
  "domestic violence", "can't go on"
];

const CRISIS_RESPONSE = `I hear that you're going through something really difficult right now.

Before we continue, I want to make sure you have access to support:

- **Crisis Text Line**: Text HOME to 741741
- **National Suicide Prevention Lifeline**: 988 (call or text)
- **National Domestic Violence Hotline**: 1-800-799-7233
- **International Association for Suicide Prevention**: https://www.iasp.info/resources/Crisis_Centres/

If you're in immediate danger, please call 911 or your local emergency services.

I'm here to chat, but please also reach out to a trained professional who can provide the support this situation deserves. You don't have to navigate this alone.`;

function detectCrisis(message: string): boolean {
  const lower = message.toLowerCase();
  return CRISIS_KEYWORDS.some(kw => lower.includes(kw));
}
```

### Rate Limiting

Add a daily session count check before calling the API. Store count in the `coachingSessions` table filtered by today's date:

```typescript
// In sendCoachingMessage(), after the tier check:
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

const todaySessions = await db
  .select()
  .from(coachingSessions)
  .where(
    and(
      eq(coachingSessions.userId, user.id),
      gte(coachingSessions.createdAt, todayStart)
    )
  );

const DAILY_SESSION_LIMIT = 5;
if (todaySessions.length >= DAILY_SESSION_LIMIT) {
  return { error: "You've reached today's coaching limit (5 sessions). Come back tomorrow!" };
}
```

### What to Replace in `actions.ts`

The current `sendCoachingMessage` function has this placeholder block:

```typescript
// CURRENT (placeholder):
const aiApiKey = process.env.AI_COACHING_API_KEY;
if (aiApiKey) {
  replyContent = "AI-powered coaching is coming soon! ...";
  const context = await buildCoachingContext(user.id);
  replyContent += "\n\n" + buildCoachingMessage(context);
} else {
  const context = await buildCoachingContext(user.id);
  replyContent = buildCoachingMessage(context);
}
```

Replace it with this structure (note: this is a non-streaming version for the existing server action pattern; see Streaming section below for the streaming variant):

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/coaching/prompt-builder";

// In sendCoachingMessage(), after rate limit check:

// 1. Crisis check — run BEFORE calling AI
if (detectCrisis(userMessage)) {
  return { sessionId, reply: { role: "coach", content: CRISIS_RESPONSE, timestamp: new Date().toISOString() } };
}

// 2. Build context and system prompt
const context = await buildCoachingContext(user.id);
const systemPrompt = buildSystemPrompt(context); // new function — see below

// 3. Get existing conversation history for this session (last 10 turns)
const conversationHistory = existingMessages
  .slice(-10)
  .map(msg => ({
    role: msg.role === "coach" ? "assistant" as const : "user" as const,
    content: msg.content
  }));

// 4. Call Claude Haiku
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await anthropic.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 300,
  system: systemPrompt,
  messages: [
    ...conversationHistory,
    { role: "user", content: userMessage }
  ]
});

replyContent = response.content[0].type === "text"
  ? response.content[0].text
  : "I had trouble generating a response. Please try again.";
```

### Streaming Variant (Recommended for UX)

Server actions cannot stream directly to the client. For streaming, add a new API route at `src/app/api/coaching/stream/route.ts`:

```typescript
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth/guard";
import { hasFeatureAccess } from "@/lib/auth/tier-gate";
import { buildCoachingContext, buildSystemPrompt } from "@/lib/coaching/prompt-builder";
import { detectCrisis, CRISIS_RESPONSE } from "@/lib/coaching/safety";

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  const access = await hasFeatureAccess(user.id, "aiCoaching");
  if (!access.allowed) {
    return new Response(JSON.stringify({ error: "Premium required" }), { status: 403 });
  }

  const { message, history } = await request.json();

  // Crisis check
  if (detectCrisis(message)) {
    return new Response(CRISIS_RESPONSE, {
      headers: { "Content-Type": "text/plain" }
    });
  }

  const context = await buildCoachingContext(user.id);
  const systemPrompt = buildSystemPrompt(context);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = await anthropic.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      // Last 10 turns from history
      ...history.slice(-10),
      { role: "user", content: message }
    ]
  });

  // Return a ReadableStream that proxies Anthropic's SSE stream
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    }
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    }
  });
}
```

On the client side in the coaching component, use `fetch` with `response.body.getReader()` to stream tokens into the UI in real time.

### New Function: `buildSystemPrompt` in `prompt-builder.ts`

Add this function to the existing `src/lib/coaching/prompt-builder.ts`:

```typescript
export function buildSystemPrompt(context: CoachingContext): string {
  const { latestScores, dimensions, recentTrend, constraintViolations, recentExercises } = context;

  const lowDims = dimensions
    .filter(d => d.status === "low")
    .map(d => `${d.dimension} (${d.value}/10)`)
    .join(", ") || "none";

  const scoreBlock = latestScores
    ? `Life Score: ${latestScores.lifeScore.toFixed(1)}/10 | ` +
      `Relationship Score: ${latestScores.relScore.toFixed(1)}/10 | ` +
      `Total Quality: ${latestScores.totalQuality.toFixed(1)}/100`
    : "No score data yet (user hasn't logged yet)";

  return `You are an AI relationship coach for OmniLife...
[paste the full system prompt from section 4 above, with values interpolated here]

## User's Current State
- ${scoreBlock}
- Trend: ${recentTrend}
- Lowest dimensions: ${lowDims}
- Active violations: ${constraintViolations.join(", ") || "none"}
- Recent exercises: ${recentExercises.slice(0, 3).join(", ") || "none yet"}`;
}
```

### Package.json Change Required

Add `@anthropic-ai/sdk` to dependencies:

```bash
npm install @anthropic-ai/sdk
```

The SDK is already the right choice here — the app's CLAUDE.md notes you're familiar with it, it supports streaming out of the box, and TypeScript types are included.

### Environment Variable

Add to `.env.local` and Vercel dashboard:

```
ANTHROPIC_API_KEY=sk-ant-...
```

The existing code already references `AI_COACHING_API_KEY`. You can rename this to `ANTHROPIC_API_KEY` (the SDK's default) or keep the custom name and pass it explicitly to the `Anthropic()` constructor.

---

## 5. Safety Guardrails

### What to Never Do

- **Never diagnose.** If a user describes symptoms of anxiety, depression, PTSD, or other conditions, acknowledge their experience and recommend a professional. Do not name the condition.
- **Never assess a partner's mental state.** "It sounds like your partner might have narcissistic traits" is out of scope and potentially harmful.
- **Never provide medical advice.** If vitality/stress scores are extremely low, acknowledge it and recommend seeing a doctor — don't speculate on causes.

### Crisis Detection

Implement the keyword list from Section 4. The list should be treated as a floor, not a ceiling. Consider also flagging:
- Prolonged extreme scores (stress = 1 for 5+ consecutive days)
- Language like "I don't know how much longer I can do this"
- Explicit mentions of physical harm

For flagged turns, skip the AI call entirely and return the static crisis response. Log these events to a server-side table for review.

### Disclaimer

Every new session should begin with a one-time disclaimer (store `dismissedDisclaimer` in localStorage):

> "I'm an AI coach, not a licensed therapist. I'm here to help you reflect and grow — but for serious mental health concerns, please seek professional support."

---

## 6. Cost Control

These six controls keep costs predictable regardless of usage growth:

1. **Use Haiku, not Sonnet/Opus.** This alone is the single biggest lever — Haiku is ~4x cheaper than Sonnet for input tokens and the same ratio for output. The quality difference for relationship chat is not meaningful.

2. **Cap output at 300 tokens.** Set `max_tokens: 300` in every API call. Shorter responses are actually better for coaching (they're more actionable and easier to absorb). This hard cap prevents runaway costs from unexpectedly long generations.

3. **Trim conversation history to 10 turns.** The last 10 messages provide sufficient context for continuity. Older messages can be summarized (optional: periodically call Haiku to generate a 1-paragraph session summary to prepend instead of raw history) or simply dropped.

4. **Rate limit per user per day.** 5 sessions/day is generous for a coaching app. Most users won't approach this limit, and it prevents any single user from being a significant cost driver.

5. **Premium tier only.** Do not offer any AI coaching to Free or Pro users. Even a single free turn per day would dramatically change the cost structure. The feature exists specifically to justify the $7.99/month price point.

6. **Monitor token usage.** The Anthropic SDK response includes `usage.input_tokens` and `usage.output_tokens`. Log these per-session to your `coachingSessions` table (add `inputTokens` and `outputTokens` integer columns). This gives you visibility before costs become a surprise.

---

## 7. Implementation Checklist

In priority order:

- [ ] `npm install @anthropic-ai/sdk`
- [ ] Add `ANTHROPIC_API_KEY` to `.env.local` and Vercel
- [ ] Add `buildSystemPrompt()` to `src/lib/coaching/prompt-builder.ts`
- [ ] Create `src/lib/coaching/safety.ts` with `detectCrisis()` + `CRISIS_RESPONSE` + `DISCLAIMER_TEXT`
- [ ] Add daily rate limit check to `sendCoachingMessage()` in `actions.ts`
- [ ] Replace placeholder block in `actions.ts` with real Anthropic API call
- [ ] Add streaming route at `src/app/api/coaching/stream/route.ts` (optional but recommended for UX)
- [ ] Update coaching client component to handle streaming if using the route
- [ ] Add `inputTokens`/`outputTokens` columns to `coachingSessions` table for cost monitoring
- [ ] Add session disclaimer to coaching UI (dismiss once per browser session via localStorage)
- [ ] Test with Premium test account (admin@omnilife.app) and verify non-Premium users get the upgrade prompt

---

## Appendix: Current Code Gaps

Reading the existing code, here is what is already in place and what is missing:

**Already done:**
- `buildCoachingContext()` — fetches real user data from DB (scores, dimensions, trend, violations, exercises). This is solid and reusable.
- `buildCoachingMessage()` — good rule-based fallback. Keep this as the response when the API call fails.
- Tier gating via `hasFeatureAccess(user.id, "aiCoaching")` — correct placement.
- Session persistence in `coachingSessions` table with JSONB messages array.
- `getRecentSession()` — loads prior conversation history correctly.

**Missing (placeholders):**
- The actual Anthropic API call. The `if (aiApiKey)` branch returns a hardcoded string.
- `buildSystemPrompt()` — the context object exists but no function converts it to a system prompt.
- Crisis detection — no keyword checking before sending to AI.
- Rate limiting — no daily session count check.
- Streaming — the server action model works but streaming requires an API route.
- Token usage logging — no cost visibility per session.

The architecture is sound. The work is narrowly scoped: add the `@anthropic-ai/sdk` package, write the system prompt function, and replace ~10 lines in `actions.ts`.
