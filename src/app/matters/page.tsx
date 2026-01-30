import Link from "next/link";

import { fetchMatters, fetchClients } from "@/lib/data/queries";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseEnvReady } from "@/lib/supabase/server";
import { MattersListClient } from "@/components/matters/matters-list-client";
import { Button } from "@/components/ui/button";

export default async function MattersPage() {
  const { data: matters, source, error } = await fetchMatters();
  const { data: clients } = await fetchClients();
  const { session } = await getSessionWithProfile();
  const supabaseReady = supabaseEnvReady();

  return (
    <div className="min-h-screen bg-background font-sans dark:bg-black">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="font-lora text-4xl font-bold text-foreground dark:text-zinc-50">
            Matters
          </h1>
          <p className="mt-2 text-sm text-muted-foreground dark:text-zinc-400">
            Stage, next action, and responsible party per matter.{" "}
            <span className="font-semibold text-foreground dark:text-zinc-300">
              {source === "supabase"
                ? "Live Supabase data"
                : "Using mock data until Supabase is configured"}
            </span>
          </p>
          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </header>

        {/* Matters list with sorting and collapsible form */}
        <MattersListClient
          matters={matters}
          clients={clients}
          ownerId={session?.user.id}
          supabaseReady={supabaseReady}
        />

        {/* Back to Dashboard */}
        <div className="mt-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back to Control Center
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
