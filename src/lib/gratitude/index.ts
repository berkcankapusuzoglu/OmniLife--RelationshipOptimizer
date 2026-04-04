type DimensionScores = {
  vitality: number;
  growth: number;
  security: number;
  connection: number;
  emotional: number;
  trust: number;
  fairness: number;
  stress: number;
  autonomy: number;
};

const TEMPLATES: Record<keyof DimensionScores, string[]> = {
  vitality: [
    "feeling more energetic today",
    "my body feeling stronger",
    "having more physical energy",
  ],
  growth: [
    "learning something new today",
    "making progress on my goals",
    "growing as a person",
  ],
  security: [
    "feeling more financially secure",
    "having stability in my life",
    "the sense of safety I feel",
  ],
  connection: [
    "the meaningful connections in my life",
    "feeling more socially connected",
    "the people who care about me",
  ],
  emotional: [
    "feeling more emotionally connected with my partner",
    "the emotional closeness we share",
    "feeling understood",
  ],
  trust: [
    "the trust in my relationship",
    "my partner's reliability",
    "feeling more secure with my partner",
  ],
  fairness: [
    "feeling the balance in my relationship",
    "the mutual respect we have",
    "things feeling more equal",
  ],
  stress: [
    "feeling calmer today than yesterday",
    "reduced stress in my life",
    "having more peace of mind",
  ],
  autonomy: [
    "having more personal freedom",
    "being able to pursue my own goals",
    "feeling more independent",
  ],
};

function pickTemplate(dim: keyof DimensionScores): string {
  const options = TEMPLATES[dim];
  const dayIndex = new Date().getDate() % options.length;
  return options[dayIndex];
}

export function generateGratitude(
  current: DimensionScores,
  previous: DimensionScores | null
): string[] {
  const prefix = "I am grateful for ";

  if (!previous) {
    // No previous — pick up to 3 statements for highest-scoring dimensions
    const entries = (Object.keys(current) as (keyof DimensionScores)[])
      .map((dim) => {
        const score = dim === "stress" ? 10 - current[dim] : current[dim];
        return { dim, score };
      })
      .filter(({ score }) => score >= 7)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (entries.length === 0) {
      return [
        prefix + "the relationships in my life",
        prefix + "taking time to reflect today",
      ];
    }

    return entries.map(({ dim }) => prefix + pickTemplate(dim));
  }

  // Compute improvements
  type Improvement = { dim: keyof DimensionScores; delta: number };
  const improvements: Improvement[] = [];

  for (const dim of Object.keys(current) as (keyof DimensionScores)[]) {
    let delta: number;
    if (dim === "stress") {
      // Lower stress = improvement
      delta = previous[dim] - current[dim];
    } else {
      delta = current[dim] - previous[dim];
    }
    if (delta >= 1) {
      improvements.push({ dim, delta });
    }
  }

  if (improvements.length === 0) {
    // No improvements — pick 1-2 for the highest-scoring dimensions
    const entries = (Object.keys(current) as (keyof DimensionScores)[])
      .map((dim) => {
        const score = dim === "stress" ? 10 - current[dim] : current[dim];
        return { dim, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    return entries.map(({ dim }) => prefix + pickTemplate(dim));
  }

  return improvements
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
    .map(({ dim }) => prefix + pickTemplate(dim));
}
