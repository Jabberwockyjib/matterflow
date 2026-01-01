import { getActiveClients } from "@/lib/data/queries";
import { ActiveClientsTable } from "./active-clients-table";

export async function ActiveClientsSection() {
  const result = await getActiveClients();

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">
        Active Clients
      </h2>
      <ActiveClientsTable clients={result.data || []} />
    </div>
  );
}
