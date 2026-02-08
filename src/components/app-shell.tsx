"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import type { BreadcrumbItem } from "@/components/breadcrumbs";
import { FloatingTimerButton } from "@/components/timer/floating-timer-button";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { TimerModal } from "@/components/timer/timer-modal";
import type { MatterSummary, TaskSummary } from "@/lib/data/queries";

type AppShellProps = {
  children: React.ReactNode;
  profileName?: string | null;
  role?: string | null;
  email?: string | null;
  breadcrumbs?: BreadcrumbItem[];
  /**
   * List of matters for timer modal's matter selection.
   * Should be fetched server-side and passed down.
   */
  matters?: MatterSummary[];
  /**
   * List of tasks for timer modal's task selection (filtered by matter).
   */
  tasks?: TaskSummary[];
};

export function AppShell({
  children,
  profileName,
  role,
  email,
  breadcrumbs = [],
  matters = [],
  tasks = [],
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine if user is authenticated (has email)
  // Timer components should only show for authenticated users
  const isAuthenticated = Boolean(email);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block">
        <Sidebar role={role} profileName={profileName} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 w-60 bg-white">
            <Sidebar role={role} profileName={profileName} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          email={email}
          profileName={profileName}
          role={role}
          breadcrumbs={breadcrumbs}
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </div>

      {isAuthenticated && (
        <>
          <KeyboardShortcuts />
          <FloatingTimerButton />
          <TimerModal matters={matters} tasks={tasks} />
        </>
      )}
    </div>
  );
}
