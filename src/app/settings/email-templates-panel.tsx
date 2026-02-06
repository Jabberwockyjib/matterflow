import { getEmailTemplates } from "@/lib/email-templates/queries";
import { seedEmailTemplates } from "@/lib/email-templates/seed";
import { TemplateList } from "@/components/email-templates/template-list";

export async function EmailTemplatesPanel() {
  // Ensure templates are seeded
  await seedEmailTemplates();

  // Fetch templates
  const templates = await getEmailTemplates();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Email Templates</h2>
        <p className="text-sm text-slate-500 mt-1">
          Customize the emails sent to clients and staff. Toggle to enable/disable each email type.
        </p>
      </div>

      <TemplateList templates={templates} />
    </div>
  );
}
