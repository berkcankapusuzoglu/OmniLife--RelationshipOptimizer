interface ParetoPoint {
  lifeScore: number;
  relScore: number;
  date: string;
}

interface FrontierPoint {
  lifeScore: number;
  relScore: number;
}

// A point dominates another if it is >= in all objectives and > in at least one
function dominates(a: FrontierPoint, b: FrontierPoint): boolean {
  return (
    a.lifeScore >= b.lifeScore &&
    a.relScore >= b.relScore &&
    (a.lifeScore > b.lifeScore || a.relScore > b.relScore)
  );
}

// Find the Pareto frontier (non-dominated points) from a set of points
export function findParetoFrontier(points: ParetoPoint[]): ParetoPoint[] {
  if (points.length === 0) return [];

  const frontier: ParetoPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    let isDominated = false;
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      if (dominates(points[j], points[i])) {
        isDominated = true;
        break;
      }
    }
    if (!isDominated) {
      frontier.push(points[i]);
    }
  }

  // Sort by lifeScore ascending for consistent ordering
  frontier.sort((a, b) => a.lifeScore - b.lifeScore);

  return frontier;
}

// Euclidean distance between two points
function euclideanDistance(a: FrontierPoint, b: FrontierPoint): number {
  return Math.sqrt((a.lifeScore - b.lifeScore) ** 2 + (a.relScore - b.relScore) ** 2);
}

// Get the position of a current point relative to the Pareto frontier
export function getPositionRelativeToFrontier(
  current: FrontierPoint,
  frontier: FrontierPoint[]
): {
  distance: number;
  nearestPoint: FrontierPoint;
  isOnFrontier: boolean;
} {
  if (frontier.length === 0) {
    return {
      distance: 0,
      nearestPoint: { lifeScore: current.lifeScore, relScore: current.relScore },
      isOnFrontier: true,
    };
  }

  // Check if current point is on the frontier (not dominated by any frontier point)
  const isOnFrontier = !frontier.some((fp) => dominates(fp, current));

  // Find nearest frontier point
  let minDist = Infinity;
  let nearest = frontier[0];

  for (const fp of frontier) {
    const dist = euclideanDistance(current, fp);
    if (dist < minDist) {
      minDist = dist;
      nearest = fp;
    }
  }

  return {
    distance: Math.round(minDist * 100) / 100,
    nearestPoint: { lifeScore: nearest.lifeScore, relScore: nearest.relScore },
    isOnFrontier,
  };
}
