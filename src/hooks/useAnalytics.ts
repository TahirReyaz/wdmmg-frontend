"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { analyticsApi } from "@/api/analytics";
import type { DateRange } from "@/utils/dates";
import { qk } from "./queryKeys";

export function useSpendSummary(range: DateRange, includeGroups = true) {
  return useQuery({
    queryKey: qk.analytics.summary(range.from, range.to, includeGroups),
    queryFn: () => analyticsApi.summary(range.from, range.to, includeGroups),
    placeholderData: keepPreviousData,
  });
}

export function useGroupShares(range: DateRange) {
  return useQuery({
    queryKey: qk.analytics.groupShares(range.from, range.to),
    queryFn: () => analyticsApi.groupShares(range.from, range.to),
    placeholderData: keepPreviousData,
  });
}

/**
 * AI summary of the same figures as useSpendSummary. The server caches it while the
 * numbers are unchanged, so revisiting a range is instant; it's never retried on
 * rate limits or while AI is unavailable.
 */
export function useSpendInsights(range: DateRange, includeGroups = true) {
  return useQuery({
    queryKey: qk.analytics.insights(range.from, range.to, includeGroups),
    queryFn: () => analyticsApi.insights(range.from, range.to, includeGroups),
    staleTime: 30 * 60_000,
    retry: (count, err) => !(err instanceof ApiError && (err.status === 429 || err.status === 502)) && count < 1,
  });
}

/** Ask for a fresh take (bypasses the server cache). */
export function useRefreshInsights(range: DateRange, includeGroups = true) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => analyticsApi.insights(range.from, range.to, includeGroups, true),
    onSuccess: (data) => qc.setQueryData(qk.analytics.insights(range.from, range.to, includeGroups), data),
  });
}
