import { describe, it, expect } from "vitest";
import { evaluateConfiguredBreaks } from "../breaks";
import { parseMarathonTime } from "../time";

describe("evaluateConfiguredBreaks", () => {
  const earliestMin = parseMarathonTime("10:00am"); // 600
  const latestMin = parseMarathonTime("10:00pm");   // 1320

  it("evaluates valid lunch and dinner breaks within window", () => {
    const breaks = [
      { id: "b1", intent: "Lunch", size: "60m" },
      { id: "b2", intent: "Dinner", size: "60m" },
    ];

    const results = evaluateConfiguredBreaks(breaks, earliestMin, latestMin, 3);
    expect(results).toHaveLength(2);
    expect(results[0]!.is_active).toBe(true);
    expect(results[0]!.warning).toBeNull();
    expect(results[0]!.activity_break).toBeDefined();
    expect(results[0]!.activity_break!.name).toBe("Lunch");
    expect(results[1]!.is_active).toBe(true);
    expect(results[1]!.warning).toBeNull();
    expect(results[1]!.activity_break!.name).toBe("Dinner");
  });

  it("enforces single occurrence constraint for lunch and dinner", () => {
    const breaks = [
      { id: "b1", intent: "Lunch", size: "60m" },
      { id: "b2", intent: "Lunch", size: "45m" },
    ];

    const results = evaluateConfiguredBreaks(breaks, earliestMin, latestMin, 3);
    expect(results).toHaveLength(2);
    expect(results[0]!.is_active).toBe(true);
    expect(results[1]!.is_active).toBe(false);
    expect(results[1]!.warning).toMatch(/only 1 lunch break allowed/i);
  });

  it("allows multiple intermission or quick breather breaks", () => {
    const breaks = [
      { id: "b1", intent: "Quick Breather", size: "20m" },
      { id: "b2", intent: "Quick Breather", size: "30m" },
    ];

    const results = evaluateConfiguredBreaks(breaks, earliestMin, latestMin, 3);
    expect(results).toHaveLength(2);
    expect(results[0]!.is_active).toBe(true);
    expect(results[1]!.is_active).toBe(true);
  });

  it("calculates break capacity correctly and formats warning with singular/plural nouns", () => {
    const breaks = [
      { id: "b1", intent: "Quick Breather", size: "20m" },
      { id: "b2", intent: "Quick Breather", size: "30m" },
      { id: "b3", intent: "Intermission", size: "2h" },
    ];

    // targetCount = 1 -> capacity 0
    const res1 = evaluateConfiguredBreaks(breaks, earliestMin, latestMin, 1);
    expect(res1[0]!.is_active).toBe(false);
    expect(res1[0]!.warning).toBe("1 movie only accommodates 0 breaks");

    // targetCount = 2 -> capacity 1
    const res2 = evaluateConfiguredBreaks(breaks, earliestMin, latestMin, 2);
    expect(res2[0]!.is_active).toBe(true);
    expect(res2[1]!.is_active).toBe(false);
    expect(res2[1]!.warning).toBe("2 movies only accommodates 1 break");

    // targetCount = 3 -> capacity 2
    const res3 = evaluateConfiguredBreaks(breaks, earliestMin, latestMin, 3);
    expect(res3[0]!.is_active).toBe(true);
    expect(res3[1]!.is_active).toBe(true);
    expect(res3[2]!.is_active).toBe(false);
    expect(res3[2]!.warning).toBe("3 movies only accommodates 2 breaks");
  });

  it("detects time incompatible breaks when day starts after window", () => {
    const lateStart = parseMarathonTime("3:00pm"); // 900 min, Lunch window ends at 870
    const breaks = [{ id: "b1", intent: "Lunch", size: "60m" }];

    const results = evaluateConfiguredBreaks(breaks, lateStart, latestMin, 3);
    expect(results[0]!.is_active).toBe(false);
    expect(results[0]!.warning).toMatch(/starts after lunch/i);
  });

  it("ignores unrecognized break intents safely", () => {
    const breaks = [{ id: "b1", intent: "MidnightSnack", size: "30m" }];
    const results = evaluateConfiguredBreaks(breaks, earliestMin, latestMin, 3);
    expect(results).toHaveLength(0);
  });
});
