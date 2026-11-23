import { describe, it, expect } from "vitest";
import { BREAK_INFO } from "../BreakConfigurator";

describe("BREAK_INFO", () => {
  it("defines expected break intents and configurations", () => {
    expect(BREAK_INFO.Lunch.title).toBe("Lunch Break");
    expect(BREAK_INFO.Dinner.title).toBe("Dinner Break");
    expect(BREAK_INFO.Intermission.title).toBe("Intermission");
    expect(BREAK_INFO["Quick Breather"].title).toBe("Quick Breather");

    expect(BREAK_INFO.Lunch.sizes).toContain("60m");
    expect(BREAK_INFO.Dinner.sizes).toContain("60m");
    expect(BREAK_INFO.Intermission.sizes).toContain("3h");
    expect(BREAK_INFO["Quick Breather"].sizes).toContain("30m");

    expect(BREAK_INFO.Lunch.icon).toBeDefined();
    expect(BREAK_INFO.Lunch.color).toBeDefined();
    expect(BREAK_INFO.Dinner.icon).toBeDefined();
    expect(BREAK_INFO.Intermission.icon).toBeDefined();
    expect(BREAK_INFO["Quick Breather"].icon).toBeDefined();
  });
});
