import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDocumentTemplate } from "@/lib/document-templates/queries";

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
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/admin/templates/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Template
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          Edit: {template.name}
        </h1>

        <p className="text-slate-600">
          Template editing interface coming soon. This will allow you to:
        </p>
        <ul className="list-disc list-inside text-slate-600 mt-2 space-y-1">
          <li>Edit section content and order</li>
          <li>Configure conditional logic</li>
          <li>Map fields to intake questions</li>
          <li>Preview merged document</li>
        </ul>
      </div>
    </div>
  );
}
