import { getFirmSettings } from "@/lib/data/queries";
import { SettingsForm } from "./settings-form";

export const metadata = {
  title: "Email Settings | MatterFlow",
  description: "Configure email branding and firm settings",
};

export default async function SettingsPage() {
  const settings = await getFirmSettings();

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
        <p className="text-muted-foreground">
          Configure your firm branding for email communications
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
