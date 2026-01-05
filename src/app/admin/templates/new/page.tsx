import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadForm } from "./upload-form";

export default function NewTemplatePage() {
  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Upload New Template
        </h1>
        <p className="text-slate-600 mb-6">
          Upload a Word document (.docx) and we&apos;ll analyze it to extract sections and placeholders.
        </p>

        <UploadForm />
      </div>
    </div>
  );
}
