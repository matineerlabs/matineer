import { parseMarathonTime, minutesToTimeStr, ActivityBreak } from './time';
import {
  BREAK_INTENTS_MAP,
  BreakIntent,
  BreakIntentDefinition,
  isBreakIntent,
  resolveBreakDuration,
} from '../types/breaks';

export interface EvaluatedBreak {
  id: string;
  intent: BreakIntent | string;
  size: string;
  info: BreakIntentDefinition;
  is_active: boolean;
  warning: string | null;
  activity_break: ActivityBreak;
}

export function evaluateConfiguredBreaks(
  configuredBreaks: { id?: string; intent: string; size: string }[],
  earliestMin?: number,
  latestMin?: number,
  targetCount: number = 3
): EvaluatedBreak[] {
  const eMin = earliestMin ?? parseMarathonTime("9:30am");
  const lMin = latestMin ?? parseMarathonTime("10:30pm");

  const maxBreaks = Math.max(0, targetCount - 1);
  const results: EvaluatedBreak[] = [];
  let activeCount = 0;
  const seenSingleIntents = new Set<string>();

  for (let idx = 0; idx < configuredBreaks.length; idx++) {
    const brk = configuredBreaks[idx];
    if (!brk) continue;
    const intent = brk.intent;
    const sizeName = brk.size;
    const breakId = brk.id ?? idx.toString();

    if (!isBreakIntent(intent)) continue;
    const def = BREAK_INTENTS_MAP[intent];

    const [minDur, maxDur] = resolveBreakDuration(intent, sizeName);
    const wStart = def.windowStart;
    const wEnd = def.windowEnd;

    let timeCompatible = true;
    let warning: string | null = null;

    if (!def.allowMultiple) {
      if (seenSingleIntents.has(intent)) {
        timeCompatible = false;
        warning = `Only 1 ${intent.toLowerCase()} break allowed`;
      } else {
        seenSingleIntents.add(intent);
      }
    }

    if (timeCompatible) {
      if (intent === "Lunch") {
        if (eMin > wEnd - minDur) {
          timeCompatible = false;
          warning = `Starts after lunch (${minutesToTimeStr(eMin)})`;
        } else if (lMin < wStart + minDur) {
          timeCompatible = false;
          warning = `Ends before lunch (${minutesToTimeStr(lMin)})`;
        }
      } else if (intent === "Dinner") {
        if (lMin < wStart + minDur) {
          timeCompatible = false;
          warning = `Ends before dinner (${minutesToTimeStr(lMin)})`;
        } else if (eMin > wEnd - minDur) {
          timeCompatible = false;
          warning = `Starts after dinner (${minutesToTimeStr(eMin)})`;
        }
      } else {
        if (lMin - eMin < minDur + 100) {
          timeCompatible = false;
          warning = "Marathon window too short for this break";
        }
      }
    }

    let isActive = false;
    if (timeCompatible) {
      if (activeCount < maxBreaks) {
        isActive = true;
        activeCount += 1;
      } else {
        const moviePlural = targetCount === 1 ? 'movie' : 'movies';
        const breakPlural = maxBreaks === 1 ? 'break' : 'breaks';
        warning = `${targetCount} ${moviePlural} only accommodates ${maxBreaks} ${breakPlural}`;
      }
    }

    const actBreak = new ActivityBreak(
      intent,
      wStart,
      wEnd,
      minDur,
      maxDur
    );

    results.push({
      id: breakId,
      intent,
      size: sizeName,
      info: def,
      is_active: isActive,
      warning,
      activity_break: actBreak,
    });
  }

  return results;
}
