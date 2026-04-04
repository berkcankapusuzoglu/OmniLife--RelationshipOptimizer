"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  CheckSquare,
  Dumbbell,
  Shield,
  Layers,
  Heart,
  TrendingUp,
  Gift,
  Settings,
  BotMessageSquare,
  ClipboardList,
  HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Home", href: "/overview", icon: LayoutDashboard },
  { label: "Daily Log", href: "/daily", icon: Calendar },
  { label: "Weekly Check-in", href: "/weekly", icon: CalendarDays },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Exercises", href: "/exercises", icon: Dumbbell },
  { label: "Limits", href: "/constraints", icon: Shield },
  { label: "Scenarios", href: "/scenarios", icon: Layers },
  { label: "Partner Insights", href: "/compare", icon: Heart },
  { label: "Insights", href: "/insights", icon: TrendingUp },
  { label: "Weekly Report", href: "/weekly-report", icon: ClipboardList },
  { label: "AI Coach", href: "/coaching", icon: BotMessageSquare },
  { label: "Refer Friends", href: "/refer", icon: Gift },
  { label: "How It Works", href: "/guide", icon: HelpCircle },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarNavProps {
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps = {}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/overview" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
