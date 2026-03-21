import type { Metadata } from "next";
import { QuizClient } from "./quiz-client";

export const metadata: Metadata = {
  title: "Free Relationship Quiz — OmniLife",
  description:
    "Take a free 5-question relationship quiz and get your Relationship Pulse score instantly. No signup required.",
  openGraph: {
    title: "Free Relationship Quiz — OmniLife",
    description:
      "How strong is your relationship? Find out in 60 seconds with our free quiz.",
    images: [
      {
        url: "/api/og?life=75&rel=80&total=77&date=2026-03-21",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function QuizPage() {
  return <QuizClient />;
}
