"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthWidget } from "@/components/auth-widget";
// Timer components temporarily disabled for MVP testing
// import { FloatingTimerButton } from "@/components/timer/floating-timer-button";
// import { HeaderTimerDisplay } from "@/components/timer/header-timer-display";
// import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
// import { TimerModal } from "@/components/timer/timer-modal";
import type { MatterSummary } from "@/lib/data/queries";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/matters", label: "Matters" },
  { href: "/tasks", label: "Tasks" },
  { href: "/time", label: "Time" },
  { href: "/billing", label: "Billing" },
];

type AppShellProps = {
  children: React.ReactNode;
  profileName?: string | null;
  role?: string | null;
  email?: string | null;
  /**
   * List of matters for timer modal's matter selection.
   * Should be fetched server-side and passed down.
   */
  matters?: MatterSummary[];
};

export function AppShell({ children, profileName, role, email, matters = [] }: AppShellProps) {
  const pathname = usePathname();

  // Determine if user is authenticated (has email)
  // Timer components should only show for authenticated users
  const isAuthenticated = Boolean(email);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 text-xs font-semibold uppercase text-white grid place-items-center">
              MF
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                MatterFlow
              </p>
              <p className="text-sm font-semibold text-slate-900">Control Center</p>
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex flex-wrap items-center gap-2">
              {links.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={active ? "default" : "secondary"}
                      size="sm"
                      className={cn(
                        "rounded-full",
                        active ? "shadow-sm" : "border border-slate-200",
                      )}
                    >
                      {link.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
            {/* Header timer display - temporarily disabled for MVP testing */}
            {/* {isAuthenticated && <HeaderTimerDisplay matters={matters} />} */}
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                {profileName || "Guest"}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {role || "role unknown"}
              </p>
              <AuthWidget email={email} />
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>

      {/* Timer components - temporarily disabled for MVP testing */}
      {/* {isAuthenticated && (
        <>
          <KeyboardShortcuts />
          <FloatingTimerButton />
          <TimerModal matters={matters} />
        </>
      )} */}
    </div>
  );
}
