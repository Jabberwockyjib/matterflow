import { describe, it, expect } from "vitest";
import { validateUploadedFile, validateContentType } from "@/lib/uploads/validation";
import { createMockFile } from "./helpers";

describe("validateUploadedFile", () => {
  it("accepts valid PDF files", () => {
    const file = createMockFile("document.pdf", "application/pdf", 1024);
    expect(validateUploadedFile(file)).toBeNull();
  });

  it("accepts valid image files", () => {
    expect(validateUploadedFile(createMockFile("photo.png", "image/png", 1024))).toBeNull();
    expect(validateUploadedFile(createMockFile("photo.jpg", "image/jpeg", 1024))).toBeNull();
    expect(validateUploadedFile(createMockFile("photo.gif", "image/gif", 1024))).toBeNull();
  });

  it("accepts valid document files", () => {
    expect(
      validateUploadedFile(
        createMockFile("doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 1024)
      )
    ).toBeNull();
    expect(
      validateUploadedFile(createMockFile("data.csv", "text/csv", 1024))
    ).toBeNull();
    expect(
      validateUploadedFile(createMockFile("notes.txt", "text/plain", 1024))
    ).toBeNull();
  });

  it("rejects files exceeding 25MB", () => {
    const bigFile = createMockFile("huge.pdf", "application/pdf", 26 * 1024 * 1024);
    const error = validateUploadedFile(bigFile);
    expect(error).toContain("too large");
  });

  it("rejects empty files", () => {
    const emptyFile = createMockFile("empty.pdf", "application/pdf", 0);
    const error = validateUploadedFile(emptyFile);
    expect(error).toContain("empty");
  });

  it("rejects dangerous file extensions", () => {
    expect(validateUploadedFile(createMockFile("evil.exe", "application/x-executable", 100))).toContain("not allowed");
    expect(validateUploadedFile(createMockFile("evil.sh", "application/x-sh", 100))).toContain("not allowed");
    expect(validateUploadedFile(createMockFile("evil.php", "text/php", 100))).toContain("not allowed");
    expect(validateUploadedFile(createMockFile("evil.js", "application/javascript", 100))).toContain("not allowed");
  });

  it("rejects files with no extension", () => {
    const file = createMockFile("noext", "application/octet-stream", 100);
    const error = validateUploadedFile(file);
    expect(error).toContain("not allowed");
  });
});

describe("validateContentType", () => {
  it("accepts multipart/form-data", () => {
    const request = new Request("http://localhost/upload", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=----" },
    });
    expect(validateContentType(request)).toBeNull();
  });

  it("rejects non-multipart requests", () => {
    const request = new Request("http://localhost/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    expect(validateContentType(request)).toContain("multipart/form-data");
  });

  it("rejects requests without content-type", () => {
    const request = new Request("http://localhost/upload", { method: "POST" });
    expect(validateContentType(request)).toContain("multipart/form-data");
  });
});
