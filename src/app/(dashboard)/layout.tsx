import { requireAuth } from "@/lib/auth/guard";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/nav/SidebarNav";
import { MobileNav } from "@/components/nav/MobileNav";
import { StreakBadge } from "@/components/streak-badge";
import { WelcomeModal } from "@/components/welcome-modal";
import { getDb } from "@/lib/db";
import { dailyLogs, scenarioProfiles } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { SCENARIO_PRESETS } from "@/lib/scenarios/presets";
import { headers } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // Redirect to onboarding if not completed (avoid infinite redirect loop on /onboarding itself)
  if (!user.onboardingCompleted) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "";
    if (!pathname.startsWith("/onboarding")) {
      redirect("/onboarding");
    }
  }

  const db = getDb();
  const [logCountResult] = await db
    .select({ value: count() })
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, user.id));
  const hasLogs = (logCountResult?.value ?? 0) > 0;

  // Resolve scenario name
  let scenarioName: string | null = null;
  if (user.activeScenarioId) {
    const preset = SCENARIO_PRESETS.find((p) => p.id === user.activeScenarioId);
    if (preset) {
      scenarioName = preset.name;
    } else {
      const [dbScenario] = await db
        .select({ name: scenarioProfiles.name })
        .from(scenarioProfiles)
        .where(eq(scenarioProfiles.id, user.activeScenarioId))
        .limit(1);
      scenarioName = dbScenario?.name ?? null;
    }
  }

  return (
    <div className="flex h-full min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="text-lg font-bold tracking-tight">OmniLife</span>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav />
        </div>
        <div className="border-t px-4 py-3">
          <p className="truncate text-xs text-muted-foreground">
            {user.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user.email}
          </p>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar — safe-top adds padding for status bar on native */}
        <header className="safe-top flex items-center gap-3 border-b bg-card px-4">
          <div className="flex h-14 w-full items-center gap-3">
            <MobileNav />

            <span className="text-lg font-bold tracking-tight md:hidden">
              OmniLife
            </span>

            <div className="ml-auto flex items-center gap-3">
              <StreakBadge currentStreak={user.currentStreak ?? 0} />
              {scenarioName && scenarioName !== "Default" && (
                <Badge variant="secondary">{scenarioName}</Badge>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-6">
          {children}
        </main>
      </div>

      <WelcomeModal hasLogs={hasLogs} />
    </div>
  );
}
