import type { Metadata } from "next";
import { QuizClient } from "./quiz-client";

export const metadata: Metadata = {
  title: "Free Relationship Quiz — Couplemetric",
  description:
    "Take a free 5-question relationship quiz and get your Relationship Pulse score instantly. No signup required.",
  openGraph: {
    title: "Free Relationship Quiz — Couplemetric",
    description:
      "How strong is your relationship? Find out in 60 seconds with our free quiz.",
    images: [
      {
        // Generic quiz invitation: no invented scores.
        url: "/api/og?kind=quiz",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function QuizPage() {
  return <QuizClient />;
}
