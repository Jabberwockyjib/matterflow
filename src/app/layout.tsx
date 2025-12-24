import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AuthListener } from "@/components/auth-listener";
// import { TimerProvider } from "@/contexts/timer-context";
import { getSessionWithProfile } from "@/lib/auth/server";
import { fetchMatters } from "@/lib/data/queries";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MatterFlow™",
  description: "Workflow-first legal practice system for small firms",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch session and matters in parallel for better performance
  const [{ profile, session }, { data: matters }] = await Promise.all([
    getSessionWithProfile(),
    fetchMatters(),
  ]);

  // Timer functionality temporarily disabled for MVP testing
  // const { data: recentActivity } = await fetchRecentTimerActivity();
  // const recentEntries = recentActivity.map((entry) => ({
  //   matter_id: entry.matterId,
  //   started_at: entry.startedAt,
  // }));

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        <AuthListener />
        {/* TimerProvider temporarily disabled for MVP testing */}
        <AppShell
          profileName={profile?.full_name}
          role={profile?.role}
          email={session?.user.email}
          matters={matters}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}