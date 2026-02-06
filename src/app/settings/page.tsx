import { getSessionWithProfile } from "@/lib/auth/server";
import { getPracticeSettings } from "@/lib/data/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettingsForm } from "./profile-settings-form";
import { PracticeSettingsForm } from "./practice-settings-form";
import { IntegrationsPanel } from "./integrations-panel";
import { EmailTemplatesPanel } from "./email-templates-panel";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { session, profile } = await getSessionWithProfile();
  const { data: practiceSettings } = await getPracticeSettings();

  // Middleware handles auth, so if we're here, user is authenticated
  // Provide fallback values if profile data is missing
  const isAdmin = profile?.role === "admin";

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">
          Manage your account and practice settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="practice">Practice</TabsTrigger>}
          {isAdmin && <TabsTrigger value="integrations">Integrations</TabsTrigger>}
          {isAdmin && <TabsTrigger value="email-templates">Email Templates</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          {profile ? (
            <ProfileSettingsForm profile={profile as any} />
          ) : (
            <div className="text-center text-slate-600 py-8">
              <p>Profile data not available</p>
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="practice" className="space-y-4">
            <PracticeSettingsForm settings={practiceSettings} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="integrations" className="space-y-4">
            {profile ? (
              <IntegrationsPanel profile={profile as any} />
            ) : (
              <div className="text-center text-slate-600 py-8">
                <p>Profile data not available</p>
              </div>
            )}
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="email-templates" className="space-y-4">
            <EmailTemplatesPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
