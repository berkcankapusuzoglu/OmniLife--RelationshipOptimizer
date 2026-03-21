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
import { LogOut, Download, Save, CreditCard, Loader2, ExternalLink } from "lucide-react";

export function SettingsClient({
  user,
  weights: initialWeights,
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
}) {
  const [weights, setWeights] = useState<Weights>(initialWeights);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const isPremium = user.subscriptionTier === "premium";

  async function handleManageSubscription() {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Portal error:", data.error);
        setBillingLoading(false);
      }
    } catch {
      setBillingLoading(false);
    }
  }

  return (
    <Tabs defaultValue="profile" className="space-y-4">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="weights">Weights</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
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
    </Tabs>
  );
}
