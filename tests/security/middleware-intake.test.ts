import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Middleware protects /intake routes", () => {
  it("middleware includes /intake in protected routes check", () => {
    const content = fs.readFileSync(
      path.resolve("src/middleware.ts"),
      "utf-8"
    );

    // The isProtected check should include /intake
    expect(content).toMatch(/pathname\.startsWith\(["']\/intake["']\)/);
  });
});
