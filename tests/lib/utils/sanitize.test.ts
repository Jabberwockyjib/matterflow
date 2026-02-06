import { describe, it, expect } from "vitest";
import { escapePostgrestFilter, sanitizeFilename } from "@/lib/utils/sanitize";

describe("escapePostgrestFilter", () => {
  it("returns plain text unchanged (except dots)", () => {
    expect(escapePostgrestFilter("hello world")).toBe("hello world");
  });

  it("escapes LIKE wildcards", () => {
    expect(escapePostgrestFilter("100%")).toBe("100\\%");
    expect(escapePostgrestFilter("test_value")).toBe("test\\_value");
  });

  it("strips PostgREST syntax characters", () => {
    expect(escapePostgrestFilter("a,b")).toBe("ab");
    expect(escapePostgrestFilter("a(b)")).toBe("ab");
    expect(escapePostgrestFilter("title.ilike")).toBe("titleilike");
  });

  it("escapes single quotes", () => {
    expect(escapePostgrestFilter("O'Brien")).toBe("O''Brien");
  });

  it("handles SQL injection attempt", () => {
    const malicious = "'; DROP TABLE matters; --";
    const result = escapePostgrestFilter(malicious);
    // Single quotes are escaped (doubled)
    expect(result).toContain("''");
    // PostgREST parameterizes queries, so semicolons are harmless
    // but the quotes being escaped prevents SQL breakout
    expect(result).not.toContain("'D"); // no unescaped quote before data
  });

  it("handles PostgREST filter breakout attempt", () => {
    // Attempt to inject a new filter via .or() syntax
    const malicious = "%,title.eq.hacked)";
    const result = escapePostgrestFilter(malicious);
    expect(result).not.toContain(",");
    expect(result).not.toContain(".");
    expect(result).not.toContain(")");
  });

  it("handles empty string", () => {
    expect(escapePostgrestFilter("")).toBe("");
  });

  it("escapes backslashes", () => {
    expect(escapePostgrestFilter("a\\b")).toBe("a\\\\b");
  });
});

describe("sanitizeFilename", () => {
  it("returns normal filenames unchanged", () => {
    expect(sanitizeFilename("document.pdf")).toBe("document.pdf");
    expect(sanitizeFilename("my-file_v2.docx")).toBe("my-file_v2.docx");
  });

  it("strips path traversal sequences", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("etcpasswd");
    expect(sanitizeFilename("..\\..\\windows\\system32")).toBe("windowssystem32");
  });

  it("strips path separators", () => {
    expect(sanitizeFilename("/etc/passwd")).toBe("etcpasswd");
    expect(sanitizeFilename("C:\\Windows\\System32")).toBe("C:WindowsSystem32");
  });

  it("strips null bytes", () => {
    expect(sanitizeFilename("evil\0.php")).toBe("evil.php");
  });

  it("strips control characters", () => {
    expect(sanitizeFilename("file\x01\x02.txt")).toBe("file.txt");
  });

  it("strips leading dots", () => {
    expect(sanitizeFilename(".hidden")).toBe("hidden");
    expect(sanitizeFilename("...evil")).toBe("evil");
  });

  it("returns 'unnamed' for empty or whitespace-only input", () => {
    expect(sanitizeFilename("")).toBe("unnamed");
    expect(sanitizeFilename("   ")).toBe("unnamed");
    expect(sanitizeFilename("../..")).toBe("unnamed");
  });

  it("truncates overly long filenames", () => {
    const longName = "a".repeat(300) + ".pdf";
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(255);
    expect(result.endsWith(".pdf")).toBe(true);
  });

  it("handles combined attack vectors", () => {
    const malicious = "../../../\0evil\x01/path\\traversal.exe";
    const result = sanitizeFilename(malicious);
    expect(result).not.toContain("/");
    expect(result).not.toContain("\\");
    expect(result).not.toContain("\0");
    expect(result).not.toContain("..");
  });
});
