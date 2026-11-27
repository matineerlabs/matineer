import { describe, it, expect } from "vitest";
import {
  FormatTier,
  getFormatTier,
  isPremiumFormat,
  isAccessibilityFormat,
  isNonPremiumSpecialFormat,
  formatComparator,
  normalizeFormatName,
  resolveAllowedFormats,
} from "../formats";

describe("shared/types/formats", () => {
  describe("isPremiumFormat", () => {
    it("recognizes premium cinema formats", () => {
      expect(isPremiumFormat("IMAX")).toBe(true);
      expect(isPremiumFormat("IMAX with Laser")).toBe(true);
      expect(isPremiumFormat("Dolby Cinema at AMC")).toBe(true);
      expect(isPremiumFormat("PRIME at AMC")).toBe(true);
      expect(isPremiumFormat("4DX")).toBe(true);
      expect(isPremiumFormat("ScreenX")).toBe(true);
      expect(isPremiumFormat("Big D with XL")).toBe(true);
    });

    it("rejects standard and missing formats", () => {
      expect(isPremiumFormat("Standard")).toBe(false);
      expect(isPremiumFormat("Digital")).toBe(false);
      expect(isPremiumFormat("RealD 3D")).toBe(false);
      expect(isPremiumFormat(null)).toBe(false);
      expect(isPremiumFormat(undefined)).toBe(false);
      expect(isPremiumFormat("undefined")).toBe(false);
      expect(isPremiumFormat("")).toBe(false);
    });

    it("excludes non-premium special formats even if name contains keywords", () => {
      expect(isPremiumFormat("Fan Faves IMAX")).toBe(false);
      expect(isPremiumFormat("Sensory Friendly Prime")).toBe(false);
      expect(isPremiumFormat("Open Caption IMAX")).toBe(false);
    });
  });

  describe("isAccessibilityFormat", () => {
    it("recognizes accessibility formats", () => {
      expect(isAccessibilityFormat("Open Caption (on screen subtitles)")).toBe(true);
      expect(isAccessibilityFormat("Closed Caption")).toBe(true);
      expect(isAccessibilityFormat("Audio Described")).toBe(true);
      expect(isAccessibilityFormat("Sensory Friendly")).toBe(true);
    });

    it("rejects non-accessibility formats", () => {
      expect(isAccessibilityFormat("Digital")).toBe(false);
      expect(isAccessibilityFormat("IMAX")).toBe(false);
      expect(isAccessibilityFormat(null)).toBe(false);
    });
  });

  describe("isNonPremiumSpecialFormat", () => {
    it("identifies discounted and special non-premium formats", () => {
      expect(isNonPremiumSpecialFormat("Fan Faves")).toBe(true);
      expect(isNonPremiumSpecialFormat("Sensory Friendly")).toBe(true);
      expect(isNonPremiumSpecialFormat("Japanese with English Subtitles")).toBe(true);
      expect(isNonPremiumSpecialFormat("Spoken with English Subtitles")).toBe(true);
      expect(isNonPremiumSpecialFormat("Open Caption")).toBe(true);
    });

    it("rejects standard formats", () => {
      expect(isNonPremiumSpecialFormat("Digital")).toBe(false);
      expect(isNonPremiumSpecialFormat("Dolby Cinema")).toBe(false);
      expect(isNonPremiumSpecialFormat(null)).toBe(false);
    });
  });

  describe("getFormatTier", () => {
    it("maps formats to correct FormatTier", () => {
      expect(getFormatTier("IMAX")).toBe(FormatTier.PREMIUM);
      expect(getFormatTier("Dolby Cinema")).toBe(FormatTier.PREMIUM);
      expect(getFormatTier("Open Caption")).toBe(FormatTier.ACCESSIBILITY);
      expect(getFormatTier("Sensory Friendly")).toBe(FormatTier.ACCESSIBILITY);
      expect(getFormatTier("Digital")).toBe(FormatTier.STANDARD);
      expect(getFormatTier("Standard")).toBe(FormatTier.STANDARD);
      expect(getFormatTier(null)).toBe(FormatTier.STANDARD);
      expect(getFormatTier("undefined")).toBe(FormatTier.STANDARD);
    });
  });

  describe("formatComparator", () => {
    it("sorts premium formats ahead of standard formats and alphabetical within tier", () => {
      const formats = ["Digital", "IMAX", "Dolby Cinema", "3D"];
      const sorted = [...formats].sort(formatComparator);
      expect(sorted).toEqual(["Dolby Cinema", "IMAX", "3D", "Digital"]);
    });
  });

  describe("normalizeFormatName & resolveAllowedFormats", () => {
    it("normalizes empty, undefined, and mixed-case format names", () => {
      expect(normalizeFormatName("")).toBe("digital");
      expect(normalizeFormatName("undefined")).toBe("digital");
      expect(normalizeFormatName(null)).toBe("digital");
      expect(normalizeFormatName("  IMAX with Laser ")).toBe("imax with laser");
    });

    it("intersects saved formats with available formats and falls back when disjoint", () => {
      expect(resolveAllowedFormats(["IMAX", "Dolby", "Digital"], ["imax", "dolby"])).toEqual([
        "IMAX",
        "Dolby",
      ]);
      expect(resolveAllowedFormats(["Digital"], ["IMAX", "Dolby"])).toEqual(["Digital"]);
      expect(resolveAllowedFormats(["IMAX", "Digital"], null)).toEqual(["IMAX", "Digital"]);
    });
  });
});
