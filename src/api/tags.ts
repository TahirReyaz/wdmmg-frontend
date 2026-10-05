import type { Tag, TagInput, TagSummary } from "@/types";
import { http } from "./client";

export const tagsApi = {
  list: () => http.get<Tag[]>("/api/tags"),
  summary: (id: number) => http.get<TagSummary>(`/api/tags/${id}/summary`),
  create: (input: TagInput) => http.post<Tag>("/api/tags", input),
  update: (id: number, input: TagInput) => http.put<Tag>(`/api/tags/${id}`, input),
  remove: (id: number) => http.delete(`/api/tags/${id}`),
};
