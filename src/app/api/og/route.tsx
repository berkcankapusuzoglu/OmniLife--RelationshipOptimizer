import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getPulseLabel } from "@/lib/quiz";
import { getSiteHost } from "@/lib/site-url";

export const runtime = "edge";

function getScoreColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#7C3AED";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function clampScore(raw: string | null, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function safeDate(raw: string | null): string | null {
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

const ARCHETYPE_MAX = 40;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const siteHost = getSiteHost();
  const isQuiz = searchParams.get("kind") === "quiz";

  // Quiz shares carry only a Relationship Pulse and an archetype; the full
  // dashboard share carries life/rel/total. The two never borrow each other's numbers.
  const pulse = isQuiz ? clampScore(searchParams.get("pulse"), NaN) : NaN;
  const hasPulse = Number.isFinite(pulse);
  const archetype = (searchParams.get("archetype") ?? "").slice(0, ARCHETYPE_MAX);
  const total = isQuiz ? pulse : clampScore(searchParams.get("total"), 50);
  const life = clampScore(searchParams.get("life"), 50);
  const rel = clampScore(searchParams.get("rel"), 50);
  const date = safeDate(searchParams.get("date"));

  const headline = isQuiz ? "Relationship Pulse" : "Overall Score";
  const scoreColor = getScoreColor(Number.isFinite(total) ? total : 50);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: "linear-gradient(135deg, #1e1040 0%, #0f172a 50%, #0c2d3f 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "-60px",
            width: "240px",
            height: "240px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(13,148,136,0.15), transparent)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px 60px",
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #7C3AED, #2563EB)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 800,
                fontSize: "20px",
              }}
            >
              C
            </div>
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "24px", fontWeight: 600 }}>
              Couplemetric
            </span>
          </div>

          {/* Score section */}
          <div style={{ display: "flex", alignItems: "center", gap: "80px" }}>
            {isQuiz && !hasPulse ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span style={{ color: "white", fontSize: "64px", fontWeight: 900, lineHeight: 1.1 }}>
                  How strong is your relationship?
                </span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "28px", marginTop: "16px" }}>
                  5 questions. 60 seconds. Free.
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "14px",
                    fontWeight: 500,
                    textTransform: "uppercase" as const,
                    letterSpacing: "3px",
                  }}
                >
                  {headline}
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "120px",
                      fontWeight: 900,
                      color: scoreColor,
                      lineHeight: 1,
                      letterSpacing: "-4px",
                    }}
                  >
                    {total}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "32px" }}>/100</span>
                </div>
                <span style={{ color: scoreColor, fontSize: "20px", fontWeight: 600, marginTop: "4px" }}>
                  {getPulseLabel(total)}
                </span>
              </div>
            )}

            {/* Quiz: archetype. Dashboard: sub scores. */}
            {isQuiz ? (
              archetype ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>Archetype</span>
                  <span style={{ color: "#C4B5FD", fontSize: "44px", fontWeight: 800, lineHeight: 1.1 }}>
                    {archetype}
                  </span>
                </div>
              ) : null
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>Life Score</span>
                  <span style={{ color: "#60A5FA", fontSize: "48px", fontWeight: 800, lineHeight: 1 }}>
                    {life}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                    Relationship Score
                  </span>
                  <span style={{ color: "#FB7185", fontSize: "48px", fontWeight: 800, lineHeight: 1 }}>
                    {rel}
                  </span>
                </div>
              </div>
            )}

            {/* CTA */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  padding: "16px 32px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #7C3AED, #2563EB)",
                  color: "white",
                  fontSize: "18px",
                  fontWeight: 600,
                }}
              >
                Take the free quiz
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontSize: "14px",
                  marginTop: "8px",
                }}
              >
                {siteHost}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "14px", fontFamily: "monospace" }}>
              {date ?? ""}
            </span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "14px" }}>
              {siteHost}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
