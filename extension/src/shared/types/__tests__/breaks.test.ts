import { describe, it, expect } from "vitest";
import {
  BREAK_INTENTS_MAP,
  DEFAULT_BREAK_SIZES,
  getDefaultBreakSize,
  BreakIntent,
  isBreakIntent,
  resolveBreakDuration,
} from "../breaks";

describe("shared/types/breaks", () => {
  it("defines the 4 canonical break intents with proper windows and sizes", () => {
    const intents: BreakIntent[] = ["Lunch", "Dinner", "Intermission", "Quick Breather"];
    intents.forEach((intent) => {
      const def = BREAK_INTENTS_MAP[intent];
      expect(def).toBeDefined();
      expect(def.intent).toBe(intent);
      expect(def.sizes).toContain(def.defaultSize);
      expect(def.sizeRanges[def.defaultSize]).toBeDefined();
      expect(def.windowEnd).toBeGreaterThan(def.windowStart);
      // Domain definition must be decoupled from UI presentation
      expect((def as any).color).toBeUndefined();
      expect((def as any).iconName).toBeUndefined();
      expect((def as any).btnLabel).toBeUndefined();
    });
  });

  it("validates break intent strings using isBreakIntent", () => {
    expect(isBreakIntent("Lunch")).toBe(true);
    expect(isBreakIntent("Dinner")).toBe(true);
    expect(isBreakIntent("Intermission")).toBe(true);
    expect(isBreakIntent("Quick Breather")).toBe(true);
    expect(isBreakIntent("Snack")).toBe(false);
    expect(isBreakIntent("")).toBe(false);
  });

  it("resolves break size durations accurately", () => {
    expect(resolveBreakDuration("Lunch", "60m")).toEqual([50, 85]);
    expect(resolveBreakDuration("Lunch", "30m")).toEqual([25, 45]);
    expect(resolveBreakDuration("Lunch", "45m")).toEqual([35, 60]);
    expect(resolveBreakDuration("Lunch", "90m")).toEqual([75, 110]);
    expect(resolveBreakDuration("Intermission", "2h")).toEqual([105, 150]);
    expect(resolveBreakDuration("Intermission", "3h")).toEqual([165, 210]);
    expect(resolveBreakDuration("Quick Breather", "20m")).toEqual([20, 25]);
    // Unknown or omitted size falls back to default size
    expect(resolveBreakDuration("Lunch", "unknown")).toEqual([50, 85]);
  });

  it("provides correct default break sizes", () => {
    expect(DEFAULT_BREAK_SIZES.Lunch).toBe("60m");
    expect(DEFAULT_BREAK_SIZES.Dinner).toBe("60m");
    expect(DEFAULT_BREAK_SIZES.Intermission).toBe("3h");
    expect(DEFAULT_BREAK_SIZES["Quick Breather"]).toBe("30m");

    expect(getDefaultBreakSize("Lunch")).toBe("60m");
    expect(getDefaultBreakSize("Dinner")).toBe("60m");
    expect(getDefaultBreakSize("Intermission")).toBe("3h");
    expect(getDefaultBreakSize("Quick Breather")).toBe("30m");
    expect(getDefaultBreakSize("NonExistent")).toBe("60m");
  });

  it("enforces single vs multiple break allowance correctly", () => {
    expect(BREAK_INTENTS_MAP.Lunch.allowMultiple).toBe(false);
    expect(BREAK_INTENTS_MAP.Dinner.allowMultiple).toBe(false);
    expect(BREAK_INTENTS_MAP.Intermission.allowMultiple).toBe(true);
    expect(BREAK_INTENTS_MAP["Quick Breather"].allowMultiple).toBe(true);
  });
});
