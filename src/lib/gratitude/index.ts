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
    "the energy I felt in my body today",
    "my physical strength and vitality",
    "the boost of energy I experienced today",
  ],
  growth: [
    "the opportunity to learn and grow today",
    "the progress I made toward my goals",
    "my continued personal growth",
  ],
  security: [
    "the financial security I have in my life",
    "the stability I have in my life",
    "the sense of safety I feel",
  ],
  connection: [
    "the meaningful connections in my life",
    "the social bonds I have",
    "the people who care about me",
  ],
  emotional: [
    "the emotional connection I share with my partner",
    "the emotional closeness we share",
    "the feeling of being truly understood",
  ],
  trust: [
    "the trust in my relationship",
    "my partner's reliability",
    "the sense of security I have with my partner",
  ],
  fairness: [
    "the balance in my relationship",
    "the mutual respect we have",
    "the sense of equality we share",
  ],
  stress: [
    "the calm I felt today",
    "a reduction in my stress today",
    "the peace of mind I have right now",
  ],
  autonomy: [
    "the personal freedom I have",
    "the ability to pursue my own goals",
    "my sense of independence",
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
