import { Metadata } from "next";
import { getFirmSettings } from "@/lib/data/queries";
import { AutomationsForm } from "./automations-form";

export const metadata: Metadata = {
  title: "Automation Settings | MatterFlow",
};

export default async function AutomationsSettingsPage() {
  const settings = await getFirmSettings();

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Email Automations</h1>
        <p className="text-muted-foreground">
          Configure automatic email reminders for intake, activity, and
          invoices.
        </p>
      </div>
      <AutomationsForm settings={settings} />
    </div>
  );
}
