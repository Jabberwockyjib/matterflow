import { describe, expect, it } from "vitest";

import {
  formatDuration,
  parseDuration,
  parseDurationWithValidation,
} from "@/lib/utils/duration-parser";

describe("parseDuration", () => {
  describe("hours format", () => {
    it("parses whole hours", () => {
      expect(parseDuration("1h")).toBe(60);
      expect(parseDuration("2h")).toBe(120);
      expect(parseDuration("10h")).toBe(600);
    });

    it("parses decimal hours", () => {
      expect(parseDuration("1.5h")).toBe(90);
      expect(parseDuration("2.5h")).toBe(150);
      expect(parseDuration("0.5h")).toBe(30);
      expect(parseDuration("0.25h")).toBe(15);
    });

    it("is case insensitive", () => {
      expect(parseDuration("1H")).toBe(60);
      expect(parseDuration("1.5H")).toBe(90);
    });

    it("handles whitespace", () => {
      expect(parseDuration(" 1h ")).toBe(60);
      expect(parseDuration("  2.5h  ")).toBe(150);
    });
  });

  describe("minutes format", () => {
    it("parses minutes", () => {
      expect(parseDuration("30m")).toBe(30);
      expect(parseDuration("90m")).toBe(90);
      expect(parseDuration("120m")).toBe(120);
      expect(parseDuration("45m")).toBe(45);
    });

    it("is case insensitive", () => {
      expect(parseDuration("30M")).toBe(30);
      expect(parseDuration("90M")).toBe(90);
    });

    it("handles whitespace", () => {
      expect(parseDuration(" 30m ")).toBe(30);
      expect(parseDuration("  90m  ")).toBe(90);
    });
  });

  describe("time notation format", () => {
    it("parses HH:MM format", () => {
      expect(parseDuration("1:30")).toBe(90);
      expect(parseDuration("2:15")).toBe(135);
      expect(parseDuration("0:45")).toBe(45);
      expect(parseDuration("10:00")).toBe(600);
    });

    it("handles single digit minutes", () => {
      expect(parseDuration("1:5")).toBe(65);
      expect(parseDuration("2:0")).toBe(120);
    });

    it("handles whitespace", () => {
      expect(parseDuration(" 1:30 ")).toBe(90);
      expect(parseDuration("  2:15  ")).toBe(135);
    });

    it("rejects invalid minutes (>= 60)", () => {
      expect(parseDuration("1:60")).toBeNull();
      expect(parseDuration("1:75")).toBeNull();
      expect(parseDuration("2:99")).toBeNull();
    });
  });

  describe("combined format", () => {
    it("parses combined hours and minutes", () => {
      expect(parseDuration("1h30m")).toBe(90);
      expect(parseDuration("2h15m")).toBe(135);
      expect(parseDuration("0h45m")).toBe(45);
      expect(parseDuration("1h0m")).toBe(60);
    });

    it("is case insensitive", () => {
      expect(parseDuration("1H30M")).toBe(90);
      expect(parseDuration("2H15M")).toBe(135);
    });

    it("handles whitespace", () => {
      expect(parseDuration(" 1h30m ")).toBe(90);
    });

    it("rejects invalid minutes (>= 60)", () => {
      expect(parseDuration("1h60m")).toBeNull();
      expect(parseDuration("1h75m")).toBeNull();
    });
  });

  describe("invalid inputs", () => {
    it("returns null for empty string", () => {
      expect(parseDuration("")).toBeNull();
    });

    it("returns null for whitespace only", () => {
      expect(parseDuration("   ")).toBeNull();
    });

    it("returns null for null/undefined", () => {
      expect(parseDuration(null as unknown as string)).toBeNull();
      expect(parseDuration(undefined as unknown as string)).toBeNull();
    });

    it("returns null for plain numbers", () => {
      expect(parseDuration("90")).toBeNull();
      expect(parseDuration("1.5")).toBeNull();
    });

    it("returns null for invalid formats", () => {
      expect(parseDuration("abc")).toBeNull();
      expect(parseDuration("1.5m")).toBeNull(); // decimal minutes not supported
      expect(parseDuration("1h30")).toBeNull(); // missing 'm' suffix
      expect(parseDuration("h30m")).toBeNull(); // missing hours value
      expect(parseDuration("1hm")).toBeNull(); // missing minutes value
      expect(parseDuration("::")).toBeNull();
      expect(parseDuration("1:2:3")).toBeNull();
    });

    it("returns null for negative values", () => {
      expect(parseDuration("-1h")).toBeNull();
      expect(parseDuration("-30m")).toBeNull();
      expect(parseDuration("-1:30")).toBeNull();
    });
  });
});

describe("parseDurationWithValidation", () => {
  it("returns valid result for correct input", () => {
    const result = parseDurationWithValidation("1.5h");
    expect(result.isValid).toBe(true);
    if (result.isValid) {
      expect(result.minutes).toBe(90);
    }
  });

  it("returns invalid result with error message for incorrect input", () => {
    const result = parseDurationWithValidation("invalid");
    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.minutes).toBeNull();
      expect(result.error).toBe(
        "Invalid format. Try: 1h, 1.5h, 90m, 1:30, or 1h30m"
      );
    }
  });

  it("returns invalid result for empty input", () => {
    const result = parseDurationWithValidation("");
    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.error).toContain("Invalid format");
    }
  });
});

describe("formatDuration", () => {
  it("formats minutes only", () => {
    expect(formatDuration(30)).toBe("30m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(59)).toBe("59m");
  });

  it("formats hours only", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(180)).toBe("3h");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(135)).toBe("2h 15m");
    expect(formatDuration(75)).toBe("1h 15m");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0m");
  });

  it("handles negative values", () => {
    expect(formatDuration(-30)).toBe("");
  });

  it("handles non-finite values", () => {
    expect(formatDuration(Infinity)).toBe("");
    expect(formatDuration(NaN)).toBe("");
  });

  it("rounds fractional minutes", () => {
    expect(formatDuration(90.4)).toBe("1h 30m");
    expect(formatDuration(90.6)).toBe("1h 31m");
  });
});
