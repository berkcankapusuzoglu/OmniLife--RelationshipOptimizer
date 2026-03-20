import { requireAuth } from "@/lib/auth/guard";
import { WeeklyCheckinWrapper } from "./weekly-client";

export default async function WeeklyPage() {
  const user = await requireAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Weekly Check-in
        </h1>
        <p className="text-sm text-muted-foreground">
          Reflect on your week — wins, challenges, and goals ahead
        </p>
      </div>
      <WeeklyCheckinWrapper hasPartner={!!user.partnerId} />
    </div>
  );
}
