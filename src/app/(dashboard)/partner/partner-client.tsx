"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heart, Copy, Link2, Unlink } from "lucide-react";
import { generateInviteCode, linkPartner, unlinkPartner } from "./actions";

export function PartnerClient({
  userId,
  inviteCode,
  partner,
}: {
  userId: string;
  inviteCode: string | null;
  partner: { id: string; name: string | null; email: string } | null;
}) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (inviteCode) {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (partner) {
    return (
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
            <div>
              <div className="font-medium">{partner.name ?? "Partner"}</div>
              <div className="text-sm text-muted-foreground">
                {partner.email}
              </div>
            </div>
            <Badge variant="outline" className="ml-auto">
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
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Share Your Invite Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {inviteCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border bg-muted/50 px-4 py-3 font-mono text-2xl tracking-widest text-center">
                  {inviteCode}
                </div>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-sm text-emerald-400">Copied to clipboard</p>
              )}
              <p className="text-sm text-muted-foreground">
                Share this code with your partner so they can link their account.
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
            onClick={async () => {
              await linkPartner(userId, code);
            }}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Link Partner
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
