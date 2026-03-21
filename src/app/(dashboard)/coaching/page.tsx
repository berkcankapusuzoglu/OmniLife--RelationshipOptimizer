import { requireAuth } from "@/lib/auth/guard";
import { getUserTier } from "@/lib/subscription/access";
import { CoachingClient } from "./coaching-client";
import { getRecentSession } from "./actions";

export default async function CoachingPage() {
  const user = await requireAuth();
  const userTier = await getUserTier(user.id);

  const { sessionId, messages } = await getRecentSession();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">AI Coach</h1>
        <p className="text-sm text-muted-foreground">
          Get personalized relationship guidance based on your data
        </p>
      </div>
      <CoachingClient
        userTier={userTier}
        initialSessionId={sessionId}
        initialMessages={messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))}
      />
    </div>
  );
}
