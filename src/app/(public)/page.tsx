import type { Metadata } from "next";
import { LandingClient } from "./landing-client";

export const metadata: Metadata = {
  title: "OmniLife — Relationship Optimizer | Optimize Your Life & Relationships",
  description:
    "Multi-objective life and relationship optimization through psychology, philosophy, and mathematics. Track 9 dimensions, get personalized recommendations, and improve your Total Quality score.",
  openGraph: {
    title: "OmniLife — Relationship Optimizer",
    description:
      "Multi-objective life and relationship optimization through psychology, philosophy, and mathematics.",
    type: "website",
    siteName: "OmniLife",
  },
  twitter: {
    card: "summary_large_image",
    title: "OmniLife — Relationship Optimizer",
    description:
      "Multi-objective life and relationship optimization through psychology, philosophy, and mathematics.",
  },
};

export default function LandingPage() {
  return <LandingClient />;
}
