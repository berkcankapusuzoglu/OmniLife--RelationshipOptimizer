import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ReferralPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({
  params,
}: ReferralPageProps): Promise<Metadata> {
  const { code } = await params;
  const db = getDb();
  const [referrer] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.referralCode, code))
    .limit(1);

  const referrerName = referrer?.name ?? "A friend";

  return {
    title: `${referrerName} invited you to OmniLife`,
    description:
      "Optimize your relationship with science-backed insights, daily tracking, and personalized exercises.",
    openGraph: {
      title: `${referrerName} invited you to OmniLife`,
      description:
        "Optimize your relationship with science-backed insights, daily tracking, and personalized exercises.",
      type: "website",
    },
  };
}

export default async function ReferralLandingPage({
  params,
}: ReferralPageProps) {
  const { code } = await params;
  const db = getDb();

  const [referrer] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.referralCode, code))
    .limit(1);

  if (!referrer) {
    notFound();
  }

  const referrerName = referrer.name ?? "Your friend";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            {referrerName} thinks you&apos;d love this
          </p>
          <CardTitle className="text-3xl font-bold tracking-tight">
            OmniLife
          </CardTitle>
          <p className="text-muted-foreground">
            Relationship Optimizer
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <div>
                <p className="font-medium">Track what matters</p>
                <p className="text-sm text-muted-foreground">
                  Daily logs across life and relationship dimensions, backed by psychology research.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <div>
                <p className="font-medium">Get personalized insights</p>
                <p className="text-sm text-muted-foreground">
                  A scoring engine turns your data into actionable recommendations.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              <div>
                <p className="font-medium">Grow together</p>
                <p className="text-sm text-muted-foreground">
                  Share tasks, exercises, and weekly check-ins with your partner.
                </p>
              </div>
            </li>
          </ul>

          <div className="flex flex-col gap-3">
            <Button
              render={<Link href={`/register?ref=${code}`} />}
              className="w-full"
              size="lg"
            >
              Get Started Free
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Free to use. No credit card required.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
