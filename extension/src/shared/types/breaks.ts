/**
 * Unified break configuration source of truth for Matineer marathon planning.
 * Contains core domain types and configurations free from presentation/styling concerns.
 */

export type BreakIntent = "Lunch" | "Dinner" | "Intermission" | "Quick Breather";

export const BREAK_INTENT_VALUES: readonly BreakIntent[] = [
  "Lunch",
  "Dinner",
  "Intermission",
  "Quick Breather",
] as const;

export interface BreakIntentDefinition {
  intent: BreakIntent;
  title: string;
  windowStart: number;
  windowEnd: number;
  defaultSize: string;
  sizes: string[];
  sizeRanges: Record<string, [number, number]>;
  allowMultiple: boolean;
}

export const BREAK_INTENTS_MAP: Record<BreakIntent, BreakIntentDefinition> = {
  Lunch: {
    intent: "Lunch",
    title: "Lunch Break",
    windowStart: 660, // 11:00 AM
    windowEnd: 870,   // 2:30 PM
    defaultSize: "60m",
    sizes: ["30m", "45m", "60m", "90m"],
    sizeRanges: {
      "30m": [25, 45],
      "45m": [35, 60],
      "60m": [50, 85],
      "90m": [75, 110],
    },
    allowMultiple: false,
  },
  Dinner: {
    intent: "Dinner",
    title: "Dinner Break",
    windowStart: 1020, // 5:00 PM
    windowEnd: 1230,  // 8:30 PM
    defaultSize: "60m",
    sizes: ["30m", "45m", "60m", "90m"],
    sizeRanges: {
      "30m": [25, 45],
      "45m": [35, 60],
      "60m": [50, 85],
      "90m": [75, 110],
    },
    allowMultiple: false,
  },
  Intermission: {
    intent: "Intermission",
    title: "Intermission",
    windowStart: 0,
    windowEnd: 1800,
    defaultSize: "3h",
    sizes: ["2h", "3h", "4h"],
    sizeRanges: {
      "2h": [105, 150],
      "3h": [165, 210],
      "4h": [225, 270],
    },
    allowMultiple: true,
  },
  "Quick Breather": {
    intent: "Quick Breather",
    title: "Quick Breather",
    windowStart: 0,
    windowEnd: 1800,
    defaultSize: "30m",
    sizes: ["20m", "30m", "45m"],
    sizeRanges: {
      "20m": [20, 25],
      "30m": [30, 38],
      "45m": [45, 55],
    },
    allowMultiple: true,
  },
};

export function isBreakIntent(val: string): val is BreakIntent {
  return val in BREAK_INTENTS_MAP;
}

export function resolveBreakDuration(intent: BreakIntent, size: string): [number, number] {
  const def = BREAK_INTENTS_MAP[intent];
  if (!def) return [30, 60];
  return def.sizeRanges[size] ?? def.sizeRanges[def.defaultSize] ?? [30, 60];
}

export const DEFAULT_BREAK_SIZES: Record<BreakIntent, string> = {
  Lunch: BREAK_INTENTS_MAP.Lunch.defaultSize,
  Dinner: BREAK_INTENTS_MAP.Dinner.defaultSize,
  Intermission: BREAK_INTENTS_MAP.Intermission.defaultSize,
  "Quick Breather": BREAK_INTENTS_MAP["Quick Breather"].defaultSize,
};

export function getDefaultBreakSize(intent: string): string {
  if (isBreakIntent(intent)) {
    return BREAK_INTENTS_MAP[intent].defaultSize;
  }
  return "60m";
}
