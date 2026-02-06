import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("No secrets passed to client components", () => {
  it("integrations-panel does not pass token values to client components", () => {
    const content = fs.readFileSync(
      path.resolve("src/app/settings/integrations-panel.tsx"),
      "utf-8"
    );

    // Should NOT pass actual token/key values as props
    expect(content).not.toMatch(/webhookSignatureKey=\{.*square_webhook_signature_key/);
    expect(content).not.toMatch(/webhookSignatureKey:\s*process\.env/);

    // Should still pass boolean connection status
    expect(content).toMatch(/isConnected=/);
  });

  it("square-connect does not accept or store webhook signature key", () => {
    const content = fs.readFileSync(
      path.resolve("src/components/square-connect.tsx"),
      "utf-8"
    );

    // Should NOT have webhookSignatureKey in props interface
    expect(content).not.toMatch(/webhookSignatureKey\??: string/);
    // Should NOT have initialWebhookKey state
    expect(content).not.toMatch(/initialWebhookKey/);
  });
});
