"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Gift,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Users,
  Trophy,
  Star,
} from "lucide-react";

interface ReferClientProps {
  referralCode: string;
  userName: string;
  stats: {
    pending: number;
    signedUp: number;
    rewarded: number;
    total: number;
    monthsEarned: number;
  };
}

const SHARE_TEXT =
  "I've been using OmniLife to optimize my relationship — check it out! Get started free:";

// Incentive tiers
const TIERS = [
  { referrals: 1, reward: "1 month Premium", months: 1 },
  { referrals: 3, reward: "3 months Premium", months: 3 },
  { referrals: 5, reward: "6 months Premium", months: 6 },
];

export function ReferClient({ referralCode, userName, stats }: ReferClientProps) {
  const [copied, setCopied] = useState(false);
  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/r/${referralCode}`
      : `/r/${referralCode}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  async function handleShare() {
    const shareData = {
      title: "OmniLife — Relationship Optimizer",
      text: SHARE_TEXT,
      url: referralLink,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      copyLink();
    }
  }

  function shareWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${referralLink}`)}`;
    window.open(url, "_blank");
  }

  // Determine next tier
  const nextTier = TIERS.find((t) => t.referrals > stats.total) ?? TIERS[TIERS.length - 1];
  const progressToNext = nextTier
    ? Math.min((stats.total / nextTier.referrals) * 100, 100)
    : 100;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Share Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="size-5" />
            Your Referral Link
          </CardTitle>
          <CardDescription>
            Share this link with friends. When they sign up, you both win.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={copyLink}>
              {copied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={shareWhatsApp}>
              <MessageCircle className="mr-2 size-4" />
              Share via WhatsApp
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 size-4" />
              Share Link
            </Button>
            <Button variant="outline" onClick={copyLink}>
              <Copy className="mr-2 size-4" />
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Your Referrals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Friends referred</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.signedUp + stats.rewarded}</p>
              <p className="text-xs text-muted-foreground">Signed up</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.monthsEarned}</p>
              <p className="text-xs text-muted-foreground">Months earned</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5" />
            Rewards
          </CardTitle>
          <CardDescription>
            Get 1 free month of Premium for every friend who signs up
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{stats.total} referral{stats.total !== 1 ? "s" : ""}</span>
              <span>Next: {nextTier.reward}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
          </div>

          {/* Tiers */}
          <div className="space-y-2">
            {TIERS.map((tier) => {
              const achieved = stats.total >= tier.referrals;
              return (
                <div
                  key={tier.referrals}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    achieved
                      ? "border-primary/30 bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <Star
                    className={`size-4 ${
                      achieved ? "text-primary fill-primary" : "text-muted-foreground"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {tier.referrals} referral{tier.referrals !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{tier.reward}</p>
                  </div>
                  {achieved && (
                    <Check className="size-4 text-primary" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
