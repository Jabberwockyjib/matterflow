import type { Metadata } from "next";
import { Lora, Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AuthListener } from "@/components/auth-listener";
import { TimerProvider } from "@/contexts/timer-context";
import { getSessionWithProfile } from "@/lib/auth/server";
import { fetchMatters, fetchTasks } from "@/lib/data/queries";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
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
  const [{ profile, session }, { data: matters }, { data: tasks }] = await Promise.all([
    getSessionWithProfile(),
    fetchMatters(),
    fetchTasks(),
  ]);

  // Timer functionality temporarily disabled for MVP testing
  // const { data: recentActivity } = await fetchRecentTimerActivity();
  // const recentEntries = recentActivity.map((entry) => ({
  //   matter_id: entry.matterId,
  //   started_at: entry.startedAt,
  // }));

  return (
    <html lang="en">
      <head>
        <Script
          src="https://know.develotype.com/script.js"
          data-website-id="25bddf2c-1ac3-4327-8332-d3436eda52aa"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${lora.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        <AuthListener />
        <TimerProvider>
          <AppShell
            profileName={profile?.full_name}
            role={profile?.role}
            email={session?.user.email}
            matters={matters}
            tasks={tasks}
          >
            {children}
          </AppShell>
        </TimerProvider>
      </body>
    </html>
  );
}