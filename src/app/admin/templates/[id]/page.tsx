import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Edit, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDocumentTemplate } from "@/lib/document-templates/queries";

interface TemplateDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { id } = await params;
  const template = await getDocumentTemplate(id);

  if (!template) {
    notFound();
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
        </Link>
      </div>

      {/* Template Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="h-8 w-8" />
            {template.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{template.status}</Badge>
            {template.category && (
              <Badge variant="outline" className="capitalize">{template.category}</Badge>
            )}
            <span className="text-sm text-slate-500">v{template.version}</span>
          </div>
        </div>
        <Link href={`/admin/templates/${id}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Template
          </Button>
        </Link>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Sections</h2>
        {!template.sections || template.sections.length === 0 ? (
          <p className="text-slate-500">No sections defined yet.</p>
        ) : (
          template.sections.map((section, index) => (
            <div
              key={section.id}
              className="bg-white rounded-lg border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-slate-900">
                  {index + 1}. {section.name}
                </h3>
                {section.isConditional && (
                  <Badge variant="default">Conditional</Badge>
                )}
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">
                {section.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Fields */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Mapped Fields</h2>
        {!template.fields || template.fields.length === 0 ? (
          <p className="text-slate-500">No fields mapped yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {template.fields.map((field) => (
              <div
                key={field.id}
                className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">{field.label}</p>
                  <p className="text-xs text-slate-500">{`{{${field.name}}}`}</p>
                </div>
                <Badge variant="outline">{field.fieldType}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
