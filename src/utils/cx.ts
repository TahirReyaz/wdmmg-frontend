export type ClassValue = string | false | null | undefined | 0;

/** Joins truthy class names. */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
