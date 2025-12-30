import { describe, it, expect, beforeAll } from "vitest";
import { createMatter } from "@/lib/data/actions";
import { submitIntakeForm, approveIntakeForm } from "@/lib/intake";
import { supabaseAdmin } from "@/lib/supabase/server";

describe.skip("Intake Automation Flow", () => {
  let testMatterId: string;
  let testClientId: string;

  beforeAll(async () => {
    // Create test client
    const { data: { user } } = await supabaseAdmin().auth.admin.createUser({
      email: "testclient@example.com",
      password: "testpass123",
      email_confirm: true,
    });
    testClientId = user!.id;

    // Create profile
    await supabaseAdmin().from("profiles").insert({
      user_id: testClientId,
      full_name: "Test Client",
      role: "client",
    });
  });

  it("should auto-set intake fields when matter created with client", async () => {
    const formData = new FormData();
    formData.append("title", "Test Matter - Intake Automation");
    formData.append("clientId", testClientId);
    formData.append("matterType", "Contract Review");
    formData.append("billingModel", "hourly");
    formData.append("ownerId", testClientId);

    const result = await createMatter(formData);
    expect(result.ok).toBe(true);

    // Fetch created matter
    const { data: matter } = await supabaseAdmin()
      .from("matters")
      .select("*")
      .eq("client_id", testClientId)
      .single();

    testMatterId = matter!.id;

    expect(matter?.stage).toBe("Intake Sent");
    expect(matter?.responsible_party).toBe("client");
    expect(matter?.next_action).toBe("Complete intake form");
    expect(matter?.next_action_due_date).toBeTruthy();
  });

  it("should advance to Intake Received on form submission", async () => {
    const responses = {
      full_name: "Test Client",
      email: "testclient@example.com",
      company_name: "Test Corp",
    };

    const result = await submitIntakeForm(testMatterId, "Contract Review", responses);
    expect(result.ok).toBe(true);

    // Verify matter updated
    const { data: matter } = await supabaseAdmin()
      .from("matters")
      .select("*")
      .eq("id", testMatterId)
      .single();

    expect(matter?.stage).toBe("Intake Received");
    expect(matter?.responsible_party).toBe("lawyer");
    expect(matter?.next_action).toBe("Review intake form");
    expect(matter?.intake_received_at).toBeTruthy();
  });

  it("should advance to Under Review on approval", async () => {
    // Get intake response ID
    const { data: response } = await supabaseAdmin()
      .from("intake_responses")
      .select("id")
      .eq("matter_id", testMatterId)
      .single();

    const result = await approveIntakeForm(response!.id, testMatterId);
    expect(result.ok).toBe(true);

    // Verify matter updated
    const { data: matter } = await supabaseAdmin()
      .from("matters")
      .select("*")
      .eq("id", testMatterId)
      .single();

    expect(matter?.stage).toBe("Under Review");
    expect(matter?.next_action).toBe("Begin document review");
  });
});
