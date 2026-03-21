interface DailyLogData {
  date: string;
  vitalityScore: number;
  growthScore: number;
  securityScore: number;
  connectionScore: number;
  emotionalScore: number;
  trustScore: number;
  fairnessScore: number;
  stressScore: number;
  autonomyScore: number;
}

interface ScoreData {
  date: string;
  totalQuality: number;
}

export interface CrisisAlert {
  type: 'declining_quality' | 'sustained_low' | 'dimension_collapse';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  dimension?: string;
}

const DIMENSION_ACCESSORS: { key: string; accessor: (log: DailyLogData) => number }[] = [
  { key: 'vitality', accessor: (l) => l.vitalityScore },
  { key: 'growth', accessor: (l) => l.growthScore },
  { key: 'security', accessor: (l) => l.securityScore },
  { key: 'connection', accessor: (l) => l.connectionScore },
  { key: 'emotional', accessor: (l) => l.emotionalScore },
  { key: 'trust', accessor: (l) => l.trustScore },
  { key: 'fairness', accessor: (l) => l.fairnessScore },
  { key: 'stress', accessor: (l) => l.stressScore },
  { key: 'autonomy', accessor: (l) => l.autonomyScore },
];

/**
 * Detect crisis-level alerts from recent history.
 * Logs/scores must be sorted chronologically (oldest first).
 */
export function detectCrisisAlerts(
  logs: DailyLogData[],
  scoreHistory: ScoreData[],
): CrisisAlert[] {
  const alerts: CrisisAlert[] = [];

  // Rule 1: TotalQuality declining 5+ consecutive days
  if (scoreHistory.length >= 5) {
    let consecutiveDeclines = 0;
    for (let i = scoreHistory.length - 1; i > 0; i--) {
      if (scoreHistory[i].totalQuality < scoreHistory[i - 1].totalQuality) {
        consecutiveDeclines++;
      } else {
        break;
      }
    }
    if (consecutiveDeclines >= 5) {
      alerts.push({
        type: 'declining_quality',
        severity: 'critical',
        title: 'Overall quality declining for 5+ days',
        description: `Your Total Quality score has been declining for ${consecutiveDeclines} consecutive days. Consider reviewing your priorities and taking immediate action on your weakest dimensions.`,
      });
    }
  }

  // Rule 2: Any dimension below 3 for 3+ days
  if (logs.length >= 3) {
    const recent3 = logs.slice(-3);
    for (const { key, accessor } of DIMENSION_ACCESSORS) {
      if (recent3.every((log) => accessor(log) < 3)) {
        const latest = accessor(recent3[recent3.length - 1]);
        alerts.push({
          type: 'sustained_low',
          severity: 'critical',
          title: `${key} critically low for 3+ days`,
          description: `Your ${key} score has been below 3 for at least 3 consecutive days (currently ${latest}). This sustained low requires immediate attention.`,
          dimension: key,
        });
      }
    }
  }

  // Rule 3: Any dimension drops 4+ points in one day
  if (logs.length >= 2) {
    const prev = logs[logs.length - 2];
    const curr = logs[logs.length - 1];
    for (const { key, accessor } of DIMENSION_ACCESSORS) {
      const drop = accessor(prev) - accessor(curr);
      if (drop >= 4) {
        alerts.push({
          type: 'dimension_collapse',
          severity: 'critical',
          title: `Sharp drop in ${key}`,
          description: `Your ${key} score dropped ${drop} points in one day (${accessor(prev)} → ${accessor(curr)}). Investigate what changed and address it quickly.`,
          dimension: key,
        });
      }
    }
  }

  return alerts;
}
