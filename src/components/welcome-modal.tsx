"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Share2, X, Sparkles } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "omnilife_welcome_dismissed";

interface WelcomeModalProps {
  hasLogs: boolean;
}

export function WelcomeModal({ hasLogs }: WelcomeModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasLogs) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      // Defer state update to avoid synchronous setState in effect
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, [hasLogs]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

      <div className="relative z-10 w-full max-w-md mx-4 animate-in zoom-in-95 fade-in duration-300">
        <div className="rounded-2xl border border-white/10 bg-card p-8 shadow-2xl">
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
            <Sparkles className="h-7 w-7 text-white" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight">
            Welcome to OmniLife!
          </h2>
          <p className="mt-2 text-muted-foreground">
            Here&apos;s how to get the most out of it:
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                <Calendar className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Log daily for streaks</p>
                <p className="text-xs text-muted-foreground">
                  Build consistency and unlock milestone achievements
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10">
                <Users className="h-4 w-4 text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Invite your partner</p>
                <p className="text-xs text-muted-foreground">
                  Get bonus features and deeper relationship insights
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Share2 className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Share your score</p>
                <p className="text-xs text-muted-foreground">
                  Challenge friends and celebrate milestones together
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Button
              className="w-full h-11 font-semibold text-white border-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              }}
              render={<Link href="/daily" onClick={dismiss} />}
            >
              Start Your First Log
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
