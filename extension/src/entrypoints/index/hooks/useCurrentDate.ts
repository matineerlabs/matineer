import { useEffect, useState } from "react";
import { formatLocalDateStr } from "../../../shared/utils/time";

/**
 * Tracks the current local calendar date ("YYYY-MM-DD") and updates
 * automatically across midnight or when the tab regains visibility/focus.
 */
export function useCurrentDate(): string {
  const [todayStr, setTodayStr] = useState<string>(() => formatLocalDateStr());

  useEffect(() => {
    const syncDate = () => {
      const next = formatLocalDateStr();
      setTodayStr((prev) => (prev === next ? prev : next));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncDate();
      }
    };

    // Schedule a check just after the next local midnight
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      500
    );
    const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());
    const midnightTimer = window.setTimeout(syncDate, msUntilMidnight);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", syncDate);

    return () => {
      window.clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", syncDate);
    };
  }, [todayStr]);

  return todayStr;
}
