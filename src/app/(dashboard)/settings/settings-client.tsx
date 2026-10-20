"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeightSliders } from "@/components/forms/WeightSliders";
import { updateProfile, updateWeights, exportData } from "./actions";
import { logoutAction } from "@/lib/auth/actions";
import { DeleteAccountClient } from "@/app/(public)/delete-account/delete-account-client";
import type { Weights } from "@/lib/engine/types";
import { validateWeights } from "./weights-validation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { isNativePlatform, useNativePlatform } from "@/lib/capacitor/platform";
import { NativePaywall } from "@/components/native-paywall";
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";
import { RestorePurchasesButton } from "@/components/restore-purchases-button";
import { NotificationSettings } from "@/components/notification-settings";
import { BiometricSettings } from "@/components/biometric-settings";
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
  Smartphone,
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
  billing = null,
  device = null,
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
  /** Effective entitlement details (plain data). Absent for legacy callers. */
  billing?: {
    via: "own" | "partner" | "trial" | "none";
    source: "stripe" | "revenuecat" | "manual" | null;
    productId: string | null;
    partnerName: string | null;
    /** Server flag `NATIVE_BILLING_ENABLED`. */
    nativeBilling: boolean;
  } | null;
  /** Native device preferences (plain data). Absent for legacy callers. */
  device?: {
    pushOptIn: boolean;
    reminderHourUtc: number | null;
  } | null;
  weights: Weights;
  calibration?: CalibrationData | null;
  logCount?: number;
}) {
  const [weights, setWeights] = useState<Weights>(initialWeights);
  const [saving, setSaving] = useState(false);
  const [weightsSaved, setWeightsSaved] = useState(false);
  const [weightsError, setWeightsError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const exportInFlight = useRef(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const native = useNativePlatform();

  const isPremium = user.subscriptionTier === "premium";
  const weightsInvalid = validateWeights(weights);

  async function handleExport() {
    // Synchronous guard: a double tap must not start two downloads.
    if (exportInFlight.current) return;
    exportInFlight.current = true;
    setExporting(true);
    setExportMessage(null);
    try {
      const data = await exportData();
      if ("error" in data) {
        setExportMessage({ kind: "error", text: data.error ?? "Export failed. Please try again." });
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `couplemetric-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage({ kind: "ok", text: "Your export has been downloaded." });
    } catch {
      setExportMessage({ kind: "error", text: "Export failed. Please try again." });
    } finally {
      exportInFlight.current = false;
      setExporting(false);
    }
  }

  async function handleManageSubscription() {
    if (isNativePlatform()) return;
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
        <TabsTrigger value="billing">{native === false ? "Billing" : "Account access"}</TabsTrigger>
        <TabsTrigger value="partner">Partner</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
        {native === true && <TabsTrigger value="device">Device</TabsTrigger>}
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (profileSaving) return;
                setProfileSaving(true);
                setProfileError(null);
                setProfileSaved(false);
                const formData = new FormData(e.currentTarget);
                try {
                  const result = await updateProfile(formData);
                  if (result.error) {
                    setProfileError(result.error);
                  } else {
                    setProfileSaved(true);
                    setTimeout(() => setProfileSaved(false), 3000);
                  }
                } catch {
                  setProfileError("Your name could not be saved. Please try again.");
                } finally {
                  setProfileSaving(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={user.name}
                  required
                  maxLength={100}
                  aria-invalid={profileError ? true : undefined}
                  aria-describedby={profileError ? "profile-error" : undefined}
                />
              </div>
              {profileError && (
                <p id="profile-error" role="alert" className="text-sm text-destructive">
                  {profileError}
                </p>
              )}
              {profileSaved && (
                <p role="status" className="text-sm text-emerald-500">
                  Profile saved.
                </p>
              )}
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
              <Button type="submit" disabled={profileSaving}>
                <Save className="mr-2 h-4 w-4" />
                {profileSaving ? "Saving..." : profileSaved ? "Saved ✓" : "Save Changes"}
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
            <WeightSliders
              weights={weights}
              onChange={(next) => {
                setWeights(next);
                setWeightsSaved(false);
                setWeightsError(null);
              }}
            />
            {weightsInvalid && (
              <p id="weights-invalid" role="alert" className="text-sm text-destructive">
                {weightsInvalid}
              </p>
            )}
            {weightsError && (
              <p role="alert" className="text-sm text-destructive">
                {weightsError}
              </p>
            )}
            {weightsSaved && (
              <p role="status" className="text-sm text-emerald-500">
                Weights saved.
              </p>
            )}
            <Button
              disabled={saving || weightsInvalid !== null}
              aria-describedby={weightsInvalid ? "weights-invalid" : undefined}
              onClick={async () => {
                if (saving || weightsInvalid) return;
                setSaving(true);
                setWeightsError(null);
                setWeightsSaved(false);
                try {
                  const result = await updateWeights(weights);
                  if (result.error) {
                    setWeightsError(result.error);
                  } else {
                    setWeightsSaved(true);
                  }
                } catch {
                  setWeightsError("Your weights could not be saved. Please try again.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : weightsSaved ? "Saved ✓" : "Save Weights"}
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
              {native === false ? "Billing" : "Account access"}
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
                {billing?.via === "partner" && (
                  <p className="text-sm text-muted-foreground">
                    Included with {billing.partnerName ? `${billing.partnerName}'s` : "your partner's"} Premium
                  </p>
                )}
                {native === false && isPremium && user.subscriptionExpiresAt && (
                  <p className="text-sm text-muted-foreground">
                    Renews{" "}
                    {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              {native === false && billing?.via !== "partner" && (isPremium ? (
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
                    if (isNativePlatform()) return;
                    window.location.href = "/pricing";
                  }}
                >
                  Upgrade
                </Button>
              ))}
            </div>
            {/* Native store billing: only when the server flag and the native bridge agree */}
            {native === true && billing?.nativeBilling && billing.via !== "partner" && (
              billing.via === "own" ? (
                <div className="space-y-3">
                  <ManageSubscriptionButton source={billing.source} productId={billing.productId} />
                  <RestorePurchasesButton />
                </div>
              ) : (
                <NativePaywall userId={user.id} enabled={billing.nativeBilling} />
              )
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="data" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export all your data as a JSON file.
            </p>
            <Button variant="outline" disabled={exporting} aria-busy={exporting} onClick={handleExport}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {exporting ? "Preparing export..." : "Export Data"}
            </Button>
            {exportMessage && (
              <p
                role={exportMessage.kind === "error" ? "alert" : "status"}
                className={`text-sm ${exportMessage.kind === "error" ? "text-destructive" : "text-emerald-500"}`}
              >
                {exportMessage.text}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Delete account</CardTitle>
          </CardHeader>
          <CardContent>
            <DeleteAccountClient />
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

      {/* Device: native-only reminders and app lock. Absent from web and server HTML. */}
      {native === true && (
        <TabsContent value="device">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Device
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <NotificationSettings
                pushOptIn={device?.pushOptIn ?? false}
                reminderHourUtc={device?.reminderHourUtc ?? null}
              />
              <Separator />
              <BiometricSettings />
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
}
