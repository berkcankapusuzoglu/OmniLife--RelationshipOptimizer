"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { sendCoachingMessage } from "./actions";
import { Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "coach";
  content: string;
  timestamp: string;
}

interface CoachingClientProps {
  userTier: string;
  initialSessionId: string | null;
  initialMessages: Message[];
}

export function CoachingClient({
  userTier,
  initialSessionId,
  initialMessages,
}: CoachingClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (userTier !== "premium") {
    return (
      <UpgradePrompt featureDescription="Get personalized AI coaching insights based on your relationship data, scores, and patterns." />
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isPending) return;

    const userMsg: Message = {
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError(null);

    startTransition(async () => {
      const result = await sendCoachingMessage(sessionId, trimmed);
      if (result.error) {
        setError(result.error);
      } else {
        if (result.sessionId) {
          setSessionId(result.sessionId);
        }
        if (result.reply) {
          setMessages((prev) => [
            ...prev,
            {
              role: result.reply!.role,
              content: result.reply!.content,
              timestamp: result.reply!.timestamp,
            },
          ]);
        }
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Chat Messages */}
      <Card className="min-h-[400px]">
        <CardContent className="flex flex-col gap-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Welcome to AI Coaching</p>
                <p className="text-sm text-muted-foreground">
                  Ask about your relationship patterns, get personalized
                  suggestions, or discuss areas you want to improve.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  "What should I focus on this week?",
                  "How are my scores trending?",
                  "What exercises do you recommend?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "coach" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                  <Bot className="h-4 w-4 text-purple-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content.split("\n\n").map((paragraph, pi) => (
                  <p key={pi} className={pi > 0 ? "mt-2" : ""}>
                    {paragraph}
                  </p>
                ))}
                <p
                  className={`mt-1 text-xs ${
                    msg.role === "user"
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))}

          {isPending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                <Bot className="h-4 w-4 text-purple-400" />
              </div>
              <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your AI coach..."
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
          disabled={isPending}
        />
        <Button type="submit" disabled={isPending || !input.trim()}>
          <Send className="size-4" />
          Send
        </Button>
      </form>
    </div>
  );
}
