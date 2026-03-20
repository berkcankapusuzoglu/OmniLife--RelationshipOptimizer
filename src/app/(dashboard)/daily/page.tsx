import { requireAuth } from "@/lib/auth/guard";
import { DailyLogFormWrapper } from "./daily-client";

export default async function DailyPage() {
  const user = await requireAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Daily Log</h1>
        <p className="text-sm text-muted-foreground">
          Rate your 9 life dimensions — takes less than 2 minutes
        </p>
      </div>
      <DailyLogFormWrapper userId={user.id} />
    </div>
  );
}
