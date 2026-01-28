"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Folder,
  CheckSquare,
  Clock,
  CreditCard,
  FileText,
  Users,
  UserPlus,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

// Links visible to staff and admin only
const staffLinks: NavLink[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/matters", label: "Matters", icon: Folder },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/time", label: "Time", icon: Clock },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/documents", label: "Documents", icon: FileText },
];

// Links visible to clients only
const clientLinks: NavLink[] = [
  { href: "/", label: "My Dashboard", icon: Home },
  { href: "/my-matters", label: "My Matters", icon: Folder },
];

const adminLinks: NavLink[] = [
  { href: "/clients", label: "Clients", icon: UserPlus },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/intake", label: "Intakes", icon: ClipboardList },
  { href: "/admin/templates", label: "Templates", icon: FileText },
];

type SidebarProps = {
  role?: string | null;
  profileName?: string | null;
};

export function Sidebar({ role, profileName }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const isAdmin = role === "admin" || role === "staff";
  const isClient = role === "client";

  // Choose which links to show based on role
  const primaryLinks = isClient ? clientLinks : staffLinks;

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-slate-200 bg-gradient-to-b from-white to-slate-50/50 transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-slate-200 px-4 bg-white">
        {collapsed ? (
          <div className="h-8 w-8 rounded-lg bg-primary text-xs font-semibold uppercase text-white grid place-items-center shadow-sm ring-2 ring-accent/20">
            MF
          </div>
        ) : (
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-primary text-xs font-semibold uppercase text-white grid place-items-center shadow-sm ring-2 ring-accent/20 group-hover:ring-accent/40 transition-all">
              MF
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">
                MatterFlow
              </p>
              <p className="text-sm font-semibold text-slate-900">{isClient ? "Client Portal" : "Control Center"}</p>
            </div>
          </Link>
        )}
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {primaryLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);

            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200",
                    active
                      ? "bg-accent/10 text-primary border-l-4 border-accent font-semibold"
                      : "text-slate-600 hover:bg-accent/5 hover:text-slate-900",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", active && "text-accent")} />
                  {!collapsed && <span className="font-medium">{link.label}</span>}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-6">
            {!collapsed && (
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-accent">
                Admin
              </div>
            )}
            <div className="space-y-1">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);

                return (
                  <Link key={link.href} href={link.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200",
                        active
                          ? "bg-accent/10 text-primary border-l-4 border-accent font-semibold"
                          : "text-slate-600 hover:bg-accent/5 hover:text-slate-900",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 flex-shrink-0", active && "text-accent")} />
                      {!collapsed && <span className="font-medium">{link.label}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-slate-200 p-2 bg-white/50">
        {/* Settings Link */}
        <Link href="/settings">
          <div
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200",
              isActive("/settings")
                ? "bg-accent/10 text-primary border-l-4 border-accent font-semibold"
                : "text-slate-600 hover:bg-accent/5 hover:text-slate-900",
              collapsed && "justify-center px-2"
            )}
          >
            <Settings className={cn("h-5 w-5 flex-shrink-0", isActive("/settings") && "text-accent")} />
            {!collapsed && <span className="font-medium">Settings</span>}
          </div>
        </Link>

        {/* Profile Section */}
        {!collapsed && profileName && (
          <div className="mt-2 px-3 py-2 rounded-md bg-accent/5 border border-accent/10">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {profileName}
            </p>
            <p className="text-xs uppercase tracking-wide text-accent font-medium">
              {role || "user"}
            </p>
          </div>
        )}

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "w-full mt-2",
            collapsed && "justify-center px-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
