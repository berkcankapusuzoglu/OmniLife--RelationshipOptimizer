"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  TrendingUp,
  Settings,
  Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarNav } from "./SidebarNav";

interface BottomTab {
  label: string;
  href: string;
  icon: LucideIcon;
}

const bottomTabs: BottomTab[] = [
  { label: "Dashboard", href: "/overview", icon: LayoutDashboard },
  { label: "Daily", href: "/daily", icon: Calendar },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Insights", href: "/insights", icon: TrendingUp },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden" />
          }
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-lg font-bold tracking-tight">
              OmniLife
            </SheetTitle>
          </SheetHeader>
          <div className="px-3 py-4">
            <SidebarNav />
          </div>
        </SheetContent>
      </Sheet>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t bg-card sm:hidden">
        <nav className="flex items-center justify-around py-2">
          {bottomTabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== "/overview" && pathname.startsWith(tab.href));
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive && "stroke-[2.5px]"
                  )}
                />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
