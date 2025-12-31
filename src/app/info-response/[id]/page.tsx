import { notFound, redirect } from "next/navigation";
import { getInfoRequestById } from "@/lib/data/queries";
import { submitInfoResponse } from "@/lib/data/actions";
import { InfoResponseForm } from "@/components/clients/info-response-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InfoResponsePage({ params }: PageProps) {
  const { id } = await params;

  // Fetch info request
  const { data: infoRequest } = await getInfoRequestById(id);

  // Return 404 if not found
  if (!infoRequest) {
    notFound();
  }

  // Return 404 if already completed
  if (infoRequest.status === "completed") {
    return (
      <div className="container max-w-3xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Response Already Submitted</CardTitle>
            <CardDescription>
              You have already responded to this information request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Thank you for your response. Your lawyer has been notified and will review your answers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Server action for form submission
  async function handleSubmit(responses: Record<string, any>) {
    "use server";

    const formData = new FormData();
    formData.append("infoRequestId", id);
    formData.append("responses", JSON.stringify(responses));

    const result = await submitInfoResponse(formData);

    if (result.ok) {
      redirect(`/info-response/${id}/thank-you`);
    } else {
      throw new Error(result.error || "Failed to submit response");
    }
  }

  return (
    <div className="container max-w-3xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Information Request</h1>
        <p className="text-muted-foreground mt-2">
          Your lawyer needs additional information about your matter.
        </p>
      </div>

      <InfoResponseForm infoRequest={infoRequest} onSubmit={handleSubmit} />
    </div>
  );
}
