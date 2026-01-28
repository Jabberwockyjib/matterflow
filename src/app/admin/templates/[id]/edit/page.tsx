import { notFound } from "next/navigation";
import { getDocumentTemplate } from "@/lib/document-templates/queries";
import { TemplateEditor } from "@/components/templates/template-editor";

interface TemplateEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateEditPage({ params }: TemplateEditPageProps) {
  const { id } = await params;
  const template = await getDocumentTemplate(id);

  if (!template) {
    notFound();
  }

  return (
    <TemplateEditor
      template={template}
      initialSections={template.sections || []}
      initialFields={template.fields || []}
    />
  );
}
