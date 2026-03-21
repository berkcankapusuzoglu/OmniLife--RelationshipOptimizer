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
  GitCompareArrows,
  TrendingUp,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Daily Log", href: "/daily", icon: Calendar },
  { label: "Weekly Check-in", href: "/weekly", icon: CalendarDays },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Exercises", href: "/exercises", icon: Dumbbell },
  { label: "Constraints", href: "/constraints", icon: Shield },
  { label: "Scenarios", href: "/scenarios", icon: Layers },
  { label: "Partner", href: "/partner", icon: Heart },
  { label: "Compare", href: "/compare", icon: GitCompareArrows },
  { label: "Insights", href: "/insights", icon: TrendingUp },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
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
