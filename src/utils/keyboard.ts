import type { KeyboardEvent } from "react";

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * Form-level onKeyDown that lets the whole form be saved from the keyboard:
 * - Ctrl+Enter (⌘+Enter on Mac) saves from any field, including notes and selects.
 * - Enter saves from single-line fields, dropdowns, checkboxes and date pickers
 *   (browsers only do this by themselves for some text fields).
 * Enter still adds a new line in a textarea and still presses a focused button.
 * Fields that handle Enter themselves (e.g. "add tag") call preventDefault first.
 */
export function submitOnEnter(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter" || e.defaultPrevented || e.nativeEvent.isComposing) return;
  const target = e.target as HTMLElement;
  const withModifier = e.ctrlKey || e.metaKey;
  if (!withModifier) {
    if (e.shiftKey || e.altKey) return;
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return;
  }
  e.preventDefault();
  e.currentTarget.requestSubmit();
}

/** "Ctrl+Enter" or "⌘ Enter", for hints next to the save button. */
export const saveShortcutLabel = () => (isMac() ? "⌘ Enter" : "Ctrl+Enter");
