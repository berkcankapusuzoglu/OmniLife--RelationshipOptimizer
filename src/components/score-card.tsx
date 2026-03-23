"use client";

interface ScoreCardProps {
  totalQuality: number;
  lifeScore: number;
  relScore: number;
  pillars?: {
    vitality: number;
    growth: number;
    security: number;
    connection: number;
  };
  relDims?: {
    emotional: number;
    trust: number;
    fairness: number;
    stress: number;
    autonomy: number;
  };
  date: string;
  variant?: "square" | "og";
  streak?: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#7C3AED";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 80) return "Thriving";
  if (score >= 70) return "Strong";
  if (score >= 60) return "Growing";
  if (score >= 50) return "Developing";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

function MiniRadar({
  pillars,
  relDims,
  size = 200,
}: {
  pillars: ScoreCardProps["pillars"];
  relDims: ScoreCardProps["relDims"];
  size?: number;
}) {
  if (!pillars || !relDims) return null;

  const dimensions = [
    { label: "VIT", value: pillars.vitality },
    { label: "GRO", value: pillars.growth },
    { label: "SEC", value: pillars.security },
    { label: "CON", value: pillars.connection },
    { label: "EMO", value: relDims.emotional },
    { label: "TRU", value: relDims.trust },
    { label: "FAI", value: relDims.fairness },
    { label: "STR", value: relDims.stress },
    { label: "AUT", value: relDims.autonomy },
  ];

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const angleStep = (2 * Math.PI) / dimensions.length;

  const points = dimensions.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (d.value / 10) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1].map((frac) => {
    const r = frac * maxR;
    const ringPoints = dimensions.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    });
    return ringPoints.join(" ");
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {rings.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.5"
        />
      ))}
      {/* Axis lines */}
      {dimensions.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + maxR * Math.cos(angle)}
            y2={cy + maxR * Math.sin(angle)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5"
          />
        );
      })}
      {/* Data polygon */}
      <path
        d={pathData}
        fill="url(#radarGradient)"
        stroke="rgba(124,58,237,0.8)"
        strokeWidth="1.5"
      />
      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#7C3AED" stroke="#fff" strokeWidth="0.5" />
      ))}
      {/* Labels */}
      {dimensions.map((d, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const labelR = maxR + 16;
        return (
          <text
            key={i}
            x={cx + labelR * Math.cos(angle)}
            y={cy + labelR * Math.sin(angle)}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.5)"
            fontSize="8"
            fontFamily="var(--font-geist-mono), monospace"
          >
            {d.label}
          </text>
        );
      })}
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(124,58,237,0.3)" />
          <stop offset="100%" stopColor="rgba(37,99,235,0.3)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ShareableScoreCard({
  totalQuality,
  lifeScore,
  relScore,
  pillars,
  relDims,
  date,
  variant = "square",
  streak,
}: ScoreCardProps) {
  const scoreColor = getScoreColor(totalQuality);
  const scoreLabel = getScoreLabel(totalQuality);
  const isOG = variant === "og";

  return (
    <div
      className={`relative overflow-hidden ${isOG ? "aspect-[1200/630]" : "aspect-square"} w-full max-w-[540px]`}
      style={{
        background: "linear-gradient(135deg, #1e1040 0%, #0f172a 50%, #0c2d3f 100%)",
        borderRadius: "16px",
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #7C3AED, transparent)" }}
      />
      <div
        className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #0D9488, transparent)" }}
      />

      <div className={`relative flex h-full flex-col justify-between ${isOG ? "p-8" : "p-8"}`}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
            <span className="text-sm font-bold text-white">O</span>
          </div>
          <span className="font-semibold tracking-tight text-white/90">OmniLife</span>
        </div>

        {/* Score Content */}
        <div className={`flex flex-1 ${isOG ? "flex-row items-center gap-12 py-4" : "flex-col items-center justify-center gap-4"}`}>
          {/* Main Score */}
          <div className="flex flex-col items-center">
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-white/40">
              Overall Score
            </p>
            <div className="relative">
              <span
                className="font-mono text-7xl font-black tracking-tighter"
                style={{ color: scoreColor }}
              >
                {totalQuality.toFixed(0)}
              </span>
              <span className="absolute -right-6 top-2 text-lg text-white/30">/100</span>
            </div>
            <p className="mt-1 text-sm font-medium" style={{ color: scoreColor }}>
              {scoreLabel}
            </p>

            {/* Sub scores */}
            <div className="mt-4 flex gap-6">
              <div className="text-center">
                <p className="text-xs text-white/40">Life</p>
                <p className="font-mono text-xl font-bold text-blue-400">
                  {lifeScore.toFixed(0)}
                </p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-xs text-white/40">Relationship</p>
                <p className="font-mono text-xl font-bold text-rose-400">
                  {relScore.toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          {/* Radar */}
          {pillars && relDims && (
            <div className={isOG ? "" : "mt-4"}>
              <MiniRadar pillars={pillars} relDims={relDims} size={isOG ? 180 : 200} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs text-white/30">{date}</p>
            {streak && streak > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-400">
                <span>&#128293;</span> {streak}-day streak
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-white/30">omnilife.app</p>
        </div>
      </div>
    </div>
  );
}
