"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, Plus, Trash2 } from "lucide-react";
import { addConstraint, toggleConstraint, removeConstraint } from "./actions";
import { PremiumGate } from "@/components/premium-gate";

interface ConstraintItem {
  id: string;
  name: string;
  type: "time_budget" | "energy_budget" | "redline";
  dimension: string;
  minValue?: number;
  maxValue?: number;
  budgetHours?: number;
  isActive: boolean;
}

const DIMENSIONS = [
  "vitality",
  "growth",
  "security",
  "connection",
  "emotional",
  "trust",
  "fairness",
  "stress",
  "autonomy",
];

function getStatusColor(constraint: ConstraintItem) {
  if (!constraint.isActive) return "text-muted-foreground";
  return "text-emerald-400";
}

export function ConstraintsClient({
  constraints: initialConstraints,
  userId,
  userTier,
}: {
  constraints: ConstraintItem[];
  userId: string;
  userTier: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <PremiumGate userTier={userTier} feature="constraints">
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>

              <Plus className="mr-2 h-4 w-4" />
            <Plus className="mr-2 h-4 w-4" />
            Add Constraint
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Constraint</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                await addConstraint(formData);
                setOpen(false);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="userId" value={userId} />
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Minimum sleep quality"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="redline">
                      Redline (minimum floor)
                    </SelectItem>
                    <SelectItem value="time_budget">Time Budget</SelectItem>
                    <SelectItem value="energy_budget">Energy Budget</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dimension">Dimension</Label>
                <Select name="dimension" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dimension" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minValue">Min Value</Label>
                  <Input
                    id="minValue"
                    name="minValue"
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxValue">Max Value</Label>
                  <Input
                    id="maxValue"
                    name="maxValue"
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetHours">Budget Hours (per day)</Label>
                <Input
                  id="budgetHours"
                  name="budgetHours"
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                />
              </div>
              <Button type="submit" className="w-full">
                Add Constraint
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {initialConstraints.map((constraint) => (
          <Card key={constraint.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield
                    className={`h-4 w-4 ${getStatusColor(constraint)}`}
                  />
                  <CardTitle className="text-base">{constraint.name}</CardTitle>
                </div>
                <Switch
                  checked={constraint.isActive}
                  onCheckedChange={async () => {
                    await toggleConstraint(
                      constraint.id,
                      !constraint.isActive
                    );
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Badge variant="outline">{constraint.type}</Badge>
                <Badge variant="secondary">{constraint.dimension}</Badge>
              </div>
              <div className="font-mono text-sm text-muted-foreground">
                {constraint.type === "redline" && constraint.minValue != null && (
                  <span>Min: {constraint.minValue}</span>
                )}
                {constraint.type === "time_budget" &&
                  constraint.budgetHours != null && (
                    <span>{constraint.budgetHours}h / day</span>
                  )}
                {constraint.type === "energy_budget" &&
                  constraint.maxValue != null && (
                    <span>Max: {constraint.maxValue}</span>
                  )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={async () => {
                  await removeConstraint(constraint.id);
                }}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}

        {initialConstraints.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              No constraints set. Add redlines and budgets to protect your
              well-being.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </PremiumGate>
  );
}
