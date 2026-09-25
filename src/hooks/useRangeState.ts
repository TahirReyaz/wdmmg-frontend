"use client";

import { useMemo, useState } from "react";
import { resolveRange, type DateRange, type RangePreset } from "@/utils/dates";

/** Preset + custom date range state with the resolved range memoised. */
export function useRangeState(initial: RangePreset = "this-month") {
  const [preset, setPreset] = useState<RangePreset>(initial);
  const [custom, setCustom] = useState<DateRange>(() => resolveRange("this-month"));
  const range = useMemo(() => resolveRange(preset, custom), [preset, custom]);
  const set = (p: RangePreset, c: DateRange) => {
    setPreset(p);
    setCustom(c);
  };
  return { preset, custom, range, set };
}
