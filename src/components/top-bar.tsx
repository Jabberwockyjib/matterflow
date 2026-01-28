"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthWidget } from "@/components/auth-widget";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/breadcrumbs";
// Timer components temporarily disabled for MVP testing
// import { HeaderTimerDisplay } from "@/components/timer/header-timer-display";
// import type { MatterSummary } from "@/lib/data/queries";

type TopBarProps = {
  email?: string | null;
  profileName?: string | null;
  role?: string | null;
  onMenuClick?: () => void;
  breadcrumbs?: BreadcrumbItem[];
  // matters?: MatterSummary[]; // For timer modal
};

export function TopBar({
  email,
  profileName,
  role,
  onMenuClick,
  breadcrumbs = [],
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur px-4">
      {/* Left: Mobile menu button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumbs - visible on larger screens */}
        <div className="hidden md:block">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>

      {/* Right: Timer + Auth */}
      <div className="flex items-center gap-4">
        {/* Timer display - temporarily disabled for MVP testing */}
        {/* {email && <HeaderTimerDisplay matters={matters} />} */}

        {/* Auth widget with user info */}
        {email ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-900">
                {profileName || "Guest"}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {role || "role unknown"}
              </p>
            </div>
            <AuthWidget email={email} />
          </div>
        ) : (
          <div className="text-sm text-slate-600">
            <a href="/auth/sign-in" className="hover:underline">
              Sign in
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
