"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeightSliders } from "@/components/forms/WeightSliders";
import { updateProfile, updateWeights, exportData } from "./actions";
import { logoutAction } from "@/lib/auth/actions";
import type { Weights } from "@/lib/engine/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  LogOut,
  Download,
  Save,
  CreditCard,
  Loader2,
  ExternalLink,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Heart,
} from "lucide-react";

interface WeightSuggestionData {
  dimension: string;
  label: string;
  currentWeight: number;
  suggestedWeight: number;
  delta: number;
  reasoning: string;
  group: "pillar" | "rel";
}

interface CalibrationData {
  eligible: boolean;
  summary: string;
  suggestions: WeightSuggestionData[];
}

export function SettingsClient({
  user,
  weights: initialWeights,
  calibration,
  logCount,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    subscriptionTier: string;
    subscriptionExpiresAt: string | null;
    stripeCustomerId: string | null;
  };
  weights: Weights;
  calibration?: CalibrationData | null;
  logCount?: number;
}) {
  const [weights, setWeights] = useState<Weights>(initialWeights);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  const isPremium = user.subscriptionTier === "premium";

  async function handleManageSubscription() {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setBillingError("Billing portal is not available. Please contact support.");
        setBillingLoading(false);
      }
    } catch {
      setBillingError("Something went wrong. Please try again.");
      setBillingLoading(false);
    }
  }

  return (
    <Tabs defaultValue="profile" className="space-y-4">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="weights">Weights</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="partner">Partner</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={async (formData) => {
                await updateProfile(formData);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="userId" value={user.id} />
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={user.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  disabled
                />
              </div>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </form>

            <Separator className="my-6" />

            <form action={logoutAction}>
              <Button variant="outline" type="submit">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="weights">
        <Card>
          <CardHeader>
            <CardTitle>Optimization Weights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/40 bg-muted/30 p-4 text-sm text-muted-foreground space-y-2 mb-4">
              <p className="font-semibold text-foreground">What do weights do?</p>
              <p>
                Your Overall Score is a <strong>weighted average</strong> of your Life Score and Relationship Score.
                Within each category, individual dimensions contribute according to their relative weights.
              </p>
              <p>
                <strong>Example:</strong> If sleep and energy are your priority, increase Vitality weight. If trust is
                the focus, raise Trust weight. The app ranks higher-weighted dimensions more prominently in scores and exercise suggestions.
              </p>
              <p>
                Adjusting one dimension redistributes the remaining weight proportionally across the others. Use the number input for precise control or &ldquo;Reset equal&rdquo; to start over.
              </p>
            </div>
            <WeightSliders weights={weights} onChange={setWeights} />
            <Button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                await updateWeights(user.id, weights);
                setSaving(false);
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Weights"}
            </Button>
          </CardContent>
        </Card>

        {/* Weight Suggestions Card */}
        {calibration && calibration.eligible ? (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Weight Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {calibration.summary}
              </p>
              {calibration.suggestions.length > 0 && (
                <div className="space-y-3">
                  {calibration.suggestions.map((s) => (
                    <div
                      key={s.dimension}
                      className="rounded-lg border bg-background p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{s.label}</span>
                          <Badge variant="secondary" className="text-xs">
                            {s.group === "pillar" ? "Life" : "Relationship"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {s.currentWeight.toFixed(2)}
                          </span>
                          {s.delta > 0 ? (
                            <ArrowUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-red-500" />
                          )}
                          <span className="font-mono text-xs font-medium">
                            {s.suggestedWeight.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.reasoning}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          // Apply the suggestion to current weights
                          if (s.group === "pillar") {
                            setWeights((prev) => ({
                              ...prev,
                              pillar: {
                                ...prev.pillar,
                                [s.dimension]: s.suggestedWeight,
                              },
                            }));
                          } else {
                            setWeights((prev) => ({
                              ...prev,
                              rel: {
                                ...prev.rel,
                                [s.dimension]: s.suggestedWeight,
                              },
                            }));
                          }
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : logCount !== undefined && logCount < 14 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <Lightbulb className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Weight suggestions will be available after 14 days of logging.
                You have {logCount} day{logCount !== 1 ? "s" : ""} so far.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </TabsContent>

      <TabsContent value="billing">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {billingError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {billingError}
              </p>
            )}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">
                  Current Plan:{" "}
                  <span className="capitalize">{user.subscriptionTier}</span>
                </p>
                {isPremium && user.subscriptionExpiresAt && (
                  <p className="text-sm text-muted-foreground">
                    Renews{" "}
                    {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              {isPremium ? (
                <Button
                  variant="outline"
                  disabled={billingLoading}
                  onClick={handleManageSubscription}
                >
                  {billingLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  Manage Subscription
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    window.location.href = "/pricing";
                  }}
                >
                  Upgrade
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="data">
        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export all your data as a JSON file.
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                const data = await exportData(user.id);
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `omnilife-export-${new Date().toISOString().split("T")[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="partner">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Partner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Link your account with your partner to share insights and track your relationship together.
            </p>
            <Button render={<Link href="/partner" />}>
              Manage Partner Link
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
