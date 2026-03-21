import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { MILESTONE_PERCENTILES } from "@/lib/milestones";

export const runtime = "edge";

const MILESTONE_NAMES: Record<string, { name: string; icon: string }> = {
  first_log: { name: "First Steps", icon: "\u270F\uFE0F" },
  streak_7: { name: "Week Warrior", icon: "\uD83D\uDD25" },
  streak_14: { name: "Fortnight Force", icon: "\uD83D\uDD25" },
  streak_30: { name: "Monthly Master", icon: "\uD83D\uDD25" },
  first_exercise: { name: "Getting Active", icon: "\uD83D\uDCAA" },
  exercises_10: { name: "Exercise Enthusiast", icon: "\uD83C\uDFC6" },
  partner_linked: { name: "Better Together", icon: "\u2764\uFE0F" },
  score_80: { name: "High Achiever", icon: "\u2B50" },
  score_90: { name: "Elite Optimizer", icon: "\uD83D\uDC51" },
  first_weekly: { name: "Reflective Mind", icon: "\uD83D\uDCD6" },
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const milestoneId = searchParams.get("milestone") ?? "streak_7";
  const streak = searchParams.get("streak") ?? "";
  const name = searchParams.get("name") ?? "";

  const info = MILESTONE_NAMES[milestoneId] ?? {
    name: "Achievement Unlocked",
    icon: "\uD83C\uDFC6",
  };
  const percentile = MILESTONE_PERCENTILES[milestoneId] ?? "";

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
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.2), transparent)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.2), transparent)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            padding: "48px 60px",
            position: "relative",
          }}
        >
          {/* OmniLife branding */}
          <div
            style={{
              position: "absolute",
              top: "40px",
              left: "60px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
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
              O
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: "24px",
                fontWeight: 600,
              }}
            >
              OmniLife
            </span>
          </div>

          {/* Icon */}
          <div
            style={{
              fontSize: "72px",
              marginBottom: "16px",
              display: "flex",
            }}
          >
            {info.icon}
          </div>

          {/* Milestone name */}
          <div
            style={{
              fontSize: "56px",
              fontWeight: 900,
              background: "linear-gradient(135deg, #a78bfa, #60a5fa, #34d399)",
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1.2,
              textAlign: "center",
              display: "flex",
            }}
          >
            {info.name}!
          </div>

          {/* Name attribution */}
          {name && (
            <div
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "24px",
                marginTop: "8px",
                display: "flex",
              }}
            >
              Unlocked by {name}
            </div>
          )}

          {/* Streak count */}
          {streak && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "16px",
                padding: "8px 24px",
                borderRadius: "999px",
                background: "rgba(249, 115, 22, 0.15)",
                border: "1px solid rgba(249, 115, 22, 0.3)",
              }}
            >
              <span style={{ fontSize: "24px", display: "flex" }}>
                {"\uD83D\uDD25"}
              </span>
              <span
                style={{
                  color: "#fb923c",
                  fontSize: "24px",
                  fontWeight: 700,
                  display: "flex",
                }}
              >
                {streak}-day streak
              </span>
            </div>
          )}

          {/* Percentile */}
          {percentile && (
            <div
              style={{
                color: "#a78bfa",
                fontSize: "20px",
                fontWeight: 500,
                marginTop: "16px",
                display: "flex",
              }}
            >
              {percentile}
            </div>
          )}

          {/* CTA */}
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "14px 36px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #7C3AED, #2563EB)",
                color: "white",
                fontSize: "18px",
                fontWeight: 600,
              }}
            >
              Join OmniLife
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: "14px",
                display: "flex",
              }}
            >
              omnilife.app
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
