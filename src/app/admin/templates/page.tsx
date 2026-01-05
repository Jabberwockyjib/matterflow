import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDocumentTemplates } from "@/lib/document-templates/queries";

const statusVariants: Record<string, "default" | "success" | "outline"> = {
  draft: "default",
  active: "success",
  archived: "outline",
};

export default async function TemplatesPage() {
  const templates = await getDocumentTemplates();

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Document Templates
          </h1>
          <p className="text-slate-600 mt-1">
            Manage legal document templates for client matters
          </p>
        </div>
        <Link href="/admin/templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Template
          </Button>
        </Link>
      </div>

      {/* Template Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border border-slate-200">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No templates yet</h3>
            <p className="text-slate-600 mt-1">Upload your first document template to get started.</p>
            <Link href="/admin/templates/new" className="mt-4 inline-block">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Template
              </Button>
            </Link>
          </div>
        ) : (
          templates.map((template) => (
            <Link
              key={template.id}
              href={`/admin/templates/${template.id}`}
              className="block bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">{template.name}</h3>
                  {template.category && (
                    <p className="text-sm text-slate-500 capitalize">{template.category}</p>
                  )}
                </div>
                <Badge variant={statusVariants[template.status] || "default"}>
                  {template.status}
                </Badge>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                <span>v{template.version}</span>
                <span>{template.fields?.length || 0} fields</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
