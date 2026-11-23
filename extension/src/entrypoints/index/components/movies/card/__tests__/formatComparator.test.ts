import { describe, it, expect } from "vitest";
import { formatComparator } from "../FormatChipList";

describe("formatComparator", () => {
  it("sorts premium formats before standard formats", () => {
    const formats = ["Digital", "IMAX with Laser", "Dolby Cinema", "3D"];
    const sorted = [...formats].sort(formatComparator);
    // Premium formats (Dolby, IMAX) come before standard formats
    expect(sorted[0]).toBe("Dolby Cinema");
    expect(sorted[1]).toBe("IMAX with Laser");
    expect(sorted[2]).toBe("3D");
    expect(sorted[3]).toBe("Digital");
  });

  it("handles case-insensitive premium names (Prime, 4DX, ScreenX, XL)", () => {
    const formats = ["Digital", "prime at amc", "screenx", "Standard"];
    const sorted = [...formats].sort(formatComparator);
    expect(sorted.slice(0, 2)).toEqual(["prime at amc", "screenx"]);
  });

  it("sorts standard formats alphabetically when neither is premium", () => {
    const formats = ["Open Caption", "Digital", "Audio Described"];
    const sorted = [...formats].sort(formatComparator);
    expect(sorted).toEqual(["Audio Described", "Digital", "Open Caption"]);
  });
});
