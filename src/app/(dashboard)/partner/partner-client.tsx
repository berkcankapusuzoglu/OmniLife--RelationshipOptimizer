"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Heart,
  Copy,
  Link2,
  Unlink,
  Share2,
  Trophy,
  TrendingUp,
  Check,
} from "lucide-react";
import { generateInviteCode, linkPartner, unlinkPartner } from "./actions";

const TOAST_MS = 4000;

export function PartnerClient({
  userName,
  inviteCode,
  partner,
  partnerScore,
  userScore,
}: {
  userName: string | null;
  inviteCode: string | null;
  partner: { id: string; name: string | null; email: string } | null;
  partnerScore: number | null;
  userScore: number | null;
}) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [challengeCopied, setChallengeCopied] = useState(false);
  const [justLinked, setJustLinked] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

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
      title: "Join me on Couplemetric",
      text: `${userName ?? "I"} wants to optimize your relationship together on Couplemetric!`,
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
    const challengeText = `I scored ${scoreText}/100 on Couplemetric. Think we can do better together? Join me: ${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Couplemetric Challenge",
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
    setLinkError(null);
    setLinking(true);
    try {
      const result = await linkPartner(code);
      if (!result.ok) {
        setLinkError(result.error);
        return;
      }
      setJustLinked(true);
      setCode("");
    } catch {
      setLinkError("We could not link your accounts right now. Please try again.");
    } finally {
      setLinking(false);
    }
  }

  async function handleConfirmUnlink() {
    setUnlinking(true);
    try {
      const result = await unlinkPartner();
      setUnlinkOpen(false);
      setJustLinked(false);
      setToast(
        result.ok
          ? { message: "Partner unlinked. You can link again with a new invite code.", tone: "success" }
          : { message: result.error, tone: "error" },
      );
    } catch {
      setUnlinkOpen(false);
      setToast({ message: "We could not unlink your accounts right now. Please try again.", tone: "error" });
    } finally {
      setUnlinking(false);
    }
  }

  const toastNode = toast && (
    <div
      role="status"
      aria-live="polite"
      data-tone={toast.tone}
      className={`fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-md border px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
        toast.tone === "success"
          ? "border-emerald-500/30 bg-background text-emerald-400"
          : "border-destructive/30 bg-background text-destructive"
      }`}
    >
      {toast.message}
    </div>
  );

  // Linked partner view
  if (partner) {
    return (
      <div className="space-y-6">
        {toastNode}
        {justLinked && (
          <Card className="border-rose-500/20 bg-rose-500/5 animate-in fade-in slide-in-from-top-2">
            <CardContent className="flex items-center gap-3 p-4">
              <Heart className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-rose-400">
                  Partner Linked!
                </p>
                <p className="text-xs text-muted-foreground">
                  You can now compare scores and share tasks. If either of you
                  has Premium, it covers you both while you stay linked.
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-400/10 font-mono text-lg text-rose-400">
                {(partner.name ?? partner.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 basis-32">
                <div className="truncate font-medium">
                  {partner.name ?? "Partner"}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {partner.email}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
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
            </div>
            <Separator />
            <AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => setUnlinkOpen(true)}
              >
                <Unlink className="mr-2 h-4 w-4" />
                Unlink Partner
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unlink your partner?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This disconnects both accounts. You will stop sharing
                    scores and tasks, any shared Premium access ends, and your
                    partner will need a new invite code to link again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={unlinking}>Keep partner</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={unlinking}
                    onClick={handleConfirmUnlink}
                  >
                    {unlinking ? "Unlinking…" : "Unlink Partner"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not linked view
  return (
    <div className="space-y-6">
      {toastNode}
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
                  <div className="min-w-0 flex-1 rounded-md border bg-muted/50 px-4 py-3 font-mono text-2xl tracking-widest text-center">
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
                    await generateInviteCode();
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
                onChange={(e) => {
                  setCode(e.target.value);
                  if (linkError) setLinkError(null);
                }}
                maxLength={6}
                aria-invalid={linkError ? true : undefined}
                aria-describedby={linkError ? "partnerCodeError" : undefined}
                className="font-mono text-lg tracking-widest text-center"
              />
              {linkError && (
                <p id="partnerCodeError" role="alert" className="text-sm text-destructive">
                  {linkError}
                </p>
              )}
            </div>
            <Button
              className="w-full"
              disabled={code.length !== 6 || linking}
              onClick={handleLink}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {linking ? "Linking…" : "Link Partner"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
