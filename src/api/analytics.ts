import type { GroupShareItem, PersonalAnalytics, SpendInsights } from "@/types";
import { http } from "./client";

export const analyticsApi = {
  summary: (from: string, to: string, includeGroups: boolean) =>
    http.get<PersonalAnalytics>("/api/analytics/summary", { from, to, includeGroups }),
  insights: (from: string, to: string, includeGroups: boolean, refresh = false) =>
    http.get<SpendInsights>("/api/analytics/insights", { from, to, includeGroups, refresh: refresh || undefined }),
  groupShares: (from: string, to: string) => http.get<GroupShareItem[]>("/api/analytics/group-shares", { from, to }),
};
