"use client";

interface FairnessGaugeProps {
  userEffort: number;
  partnerEffort: number;
  userName: string;
  partnerName: string;
  userCreated?: number;
  partnerCreated?: number;
}

function getBalanceColor(userPct: number): string {
  if (userPct >= 30 && userPct <= 70) return "bg-emerald-500";
  if (userPct >= 20 && userPct <= 80) return "bg-amber-500";
  return "bg-red-500";
}

function getBalanceLabel(userPct: number): string {
  if (userPct >= 40 && userPct <= 60) return "Balanced";
  if (userPct >= 30 && userPct <= 70) return "Slightly imbalanced";
  return "Imbalanced";
}

export function FairnessGauge({
  userEffort,
  partnerEffort,
  userName,
  partnerName,
  userCreated,
  partnerCreated,
}: FairnessGaugeProps) {
  const total = userEffort + partnerEffort;
  const userPct = total > 0 ? (userEffort / total) * 100 : 50;
  const partnerPct = total > 0 ? (partnerEffort / total) * 100 : 50;
  const barColor = getBalanceColor(userPct);
  const balanceLabel = getBalanceLabel(userPct);

  const showMentalLoad =
    userCreated != null && partnerCreated != null;
  const totalCreated =
    showMentalLoad ? (userCreated ?? 0) + (partnerCreated ?? 0) : 0;
  const userCreatedPct =
    totalCreated > 0 ? ((userCreated ?? 0) / totalCreated) * 100 : 50;

  return (
    <div className="space-y-3">
      {/* Main effort bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium">{userName}</span>
          <span className="text-xs text-muted-foreground">{balanceLabel}</span>
          <span className="font-medium">{partnerName}</span>
        </div>

        <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`absolute inset-y-0 left-0 rounded-l-full transition-all ${barColor}`}
            style={{ width: `${userPct}%` }}
          />
          <div
            className={`absolute inset-y-0 right-0 rounded-r-full transition-all ${barColor} opacity-60`}
            style={{ width: `${partnerPct}%` }}
          />
        </div>

        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {userEffort} pts ({Math.round(userPct)}%)
          </span>
          <span>
            ({Math.round(partnerPct)}%) {partnerEffort} pts
          </span>
        </div>
      </div>

      {/* Mental Load indicator */}
      {showMentalLoad && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Mental Load (task creation)
          </p>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-l-full bg-indigo-500/70 transition-all"
              style={{ width: `${userCreatedPct}%` }}
            />
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {userName}: {userCreated} created
            </span>
            <span>
              {partnerName}: {partnerCreated} created
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
