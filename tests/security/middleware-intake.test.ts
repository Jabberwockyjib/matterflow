import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Middleware /intake route handling", () => {
  it("middleware does NOT include /intake in protected routes (anonymous intake allowed)", () => {
    const content = fs.readFileSync(
      path.resolve("src/middleware.ts"),
      "utf-8"
    );

    // /intake is intentionally NOT in the isProtected check
    // because anonymous intake forms use invite code verification instead of auth
    expect(content).not.toMatch(/pathname\.startsWith\(["']\/intake["']\)/);
  });
});
