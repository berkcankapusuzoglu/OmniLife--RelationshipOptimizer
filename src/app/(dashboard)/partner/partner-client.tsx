"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  Copy,
  Link2,
  Unlink,
  Share2,
  Trophy,
  Sparkles,
  TrendingUp,
  Check,
} from "lucide-react";
import { generateInviteCode, linkPartner, unlinkPartner } from "./actions";
import type { CoupleBonus } from "@/lib/subscription/couple-bonus";

export function PartnerClient({
  userId,
  userName,
  inviteCode,
  partner,
  partnerScore,
  userScore,
  coupleBonus,
}: {
  userId: string;
  userName: string | null;
  inviteCode: string | null;
  partner: { id: string; name: string | null; email: string } | null;
  partnerScore: number | null;
  userScore: number | null;
  coupleBonus: CoupleBonus;
}) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [challengeCopied, setChallengeCopied] = useState(false);
  const [justLinked, setJustLinked] = useState(false);

  const inviteUrl =
    typeof window !== "undefined" && inviteCode
      ? `${window.location.origin}/invite/${inviteCode}`
      : "";

  async function handleCopyCode() {
    if (inviteCode) {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleShareLink() {
    if (!inviteUrl) return;

    const shareData = {
      title: "Join me on OmniLife",
      text: `${userName ?? "I"} wants to optimize your relationship together on OmniLife!`,
      url: inviteUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or not supported, fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(inviteUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleShareChallenge() {
    const scoreText = userScore !== null ? Math.round(userScore) : "??";
    const challengeText = `I scored ${scoreText}/100 on OmniLife. Think we can do better together? Join me: ${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "OmniLife Challenge",
          text: challengeText,
          url: inviteUrl,
        });
        return;
      } catch {
        // fall through
      }
    }

    await navigator.clipboard.writeText(challengeText);
    setChallengeCopied(true);
    setTimeout(() => setChallengeCopied(false), 2000);
  }

  async function handleLink() {
    await linkPartner(userId, code);
    setJustLinked(true);
  }

  // Linked partner view
  if (partner) {
    return (
      <div className="space-y-6">
        {/* Couple Bonus Banner */}
        {coupleBonus.isCouple && (
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-400">
                  Couple Bonus Active
                </p>
                <p className="text-xs text-muted-foreground">
                  {coupleBonus.exerciseLimit} exercises, {coupleBonus.historyDays}
                  -day history, couple comparison view
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {justLinked && (
          <Card className="border-rose-500/20 bg-rose-500/5 animate-in fade-in slide-in-from-top-2">
            <CardContent className="flex items-center gap-3 p-4">
              <Heart className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-rose-400">
                  Partner Linked!
                </p>
                <p className="text-xs text-muted-foreground">
                  You&apos;ve unlocked couple bonuses: +3 extra exercises, 14-day
                  history, and couple comparison view.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-400" />
              <CardTitle>Linked Partner</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-400/10 font-mono text-lg text-rose-400">
                {(partner.name ?? partner.email)[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-medium">
                  {partner.name ?? "Partner"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {partner.email}
                </div>
              </div>
              {partnerScore !== null && (
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums">
                    {Math.round(partnerScore)}
                  </div>
                  <div className="text-xs text-muted-foreground">score</div>
                </div>
              )}
              <Badge variant="outline" className="shrink-0">
                <Link2 className="mr-1 h-3 w-3" />
                Linked
              </Badge>
            </div>
            <Separator />
            <Button
              variant="outline"
              className="text-destructive"
              onClick={async () => {
                await unlinkPartner(userId);
              }}
            >
              <Unlink className="mr-2 h-4 w-4" />
              Unlink Partner
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not linked view
  return (
    <div className="space-y-6">
      {/* Challenge Your Partner - PRIMARY viral driver */}
      {inviteCode && userScore !== null && (
        <Card className="border-amber-500/20 overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <CardTitle>Challenge Your Partner</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-400" />
                  <span className="text-3xl font-bold tabular-nums">
                    {Math.round(userScore)}/100
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your relationship quality score
                </p>
                <p className="text-base font-medium">
                  Think your partner can do better? Challenge them to join!
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleShareChallenge}
              >
                {challengeCopied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied to clipboard!
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Send Challenge
                  </>
                )}
              </Button>
            </CardContent>
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Share Your Invite Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inviteCode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border bg-muted/50 px-4 py-3 font-mono text-2xl tracking-widest text-center">
                    {inviteCode}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCode}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-emerald-400">
                    Copied to clipboard
                  </p>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleShareLink}
                >
                  {linkCopied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-emerald-400" />
                      Link copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Invite Link
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Share this link with your partner — they&apos;ll see a branded
                  invite page and can sign up in one tap.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Generate an invite code to share with your partner.
                </p>
                <Button
                  onClick={async () => {
                    await generateInviteCode(userId);
                  }}
                >
                  Generate Code
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enter Partner&apos;s Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partnerCode">Invite Code</Label>
              <Input
                id="partnerCode"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                className="font-mono text-lg tracking-widest text-center"
              />
            </div>
            <Button
              className="w-full"
              disabled={code.length !== 6}
              onClick={handleLink}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Link Partner
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Couple Bonus Teaser */}
      {!coupleBonus.isCouple && (
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <p className="text-sm font-medium text-purple-400">
                Link your partner to unlock Couple Bonus
              </p>
            </div>
            <ul className="grid gap-1 text-xs text-muted-foreground pl-6">
              <li>+3 extra exercises (8 total instead of 5)</li>
              <li>14-day history (instead of 7)</li>
              <li>Couple comparison view</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
