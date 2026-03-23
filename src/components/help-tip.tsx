"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

export function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex items-center text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg animate-in fade-in zoom-in-95 duration-150">
          {text}
        </div>
      )}
    </span>
  );
}
