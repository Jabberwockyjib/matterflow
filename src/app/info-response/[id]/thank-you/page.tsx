import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function ThankYouPage() {
  return (
    <div className="container max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <CardTitle>Response Submitted Successfully</CardTitle>
              <CardDescription>
                Thank you for providing the requested information.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your lawyer has been notified and will review your responses. They will contact you if any additional information is needed.
          </p>
          <p className="text-sm text-muted-foreground">
            You can now close this page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
