/**
 * Remembers the choices from the last shared expense added in a group, so the next one
 * starts from them: who it was split equally with, its category and its date.
 * Kept in this browser only (per signed-in user and group); missing storage is fine.
 */
export interface GroupExpenseDefaults {
  /** Members of the last equal split; absent when the last split wasn't equal. */
  memberIds?: number[];
  categoryId?: number;
  date?: string;
  savedAt: number;
}

/** A remembered date is only reused for a while, so a new day doesn't start on an old date. */
const DATE_TTL_MS = 12 * 60 * 60 * 1000;

const key = (userId: number, groupId: number) => `wdmmg:group-expense-defaults:${userId}:${groupId}`;

export function loadGroupExpenseDefaults(userId: number | undefined, groupId: number): GroupExpenseDefaults | null {
  if (userId == null) return null;
  try {
    const raw = window.localStorage.getItem(key(userId, groupId));
    if (!raw) return null;
    const v = JSON.parse(raw) as GroupExpenseDefaults;
    if (typeof v !== "object" || v === null || typeof v.savedAt !== "number") return null;
    return {
      savedAt: v.savedAt,
      memberIds: Array.isArray(v.memberIds) ? v.memberIds.filter((n) => Number.isInteger(n)) : undefined,
      categoryId: Number.isInteger(v.categoryId) ? v.categoryId : undefined,
      date: typeof v.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.date) && Date.now() - v.savedAt < DATE_TTL_MS ? v.date : undefined,
    };
  } catch {
    return null;
  }
}

export function saveGroupExpenseDefaults(userId: number | undefined, groupId: number, value: Omit<GroupExpenseDefaults, "savedAt">) {
  if (userId == null) return;
  try {
    window.localStorage.setItem(key(userId, groupId), JSON.stringify({ ...value, savedAt: Date.now() }));
  } catch {
    // Private mode / storage blocked: just don't remember.
  }
}
