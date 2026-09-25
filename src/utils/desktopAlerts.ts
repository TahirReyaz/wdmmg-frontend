const KEY = "wdmmg.desktopAlerts";

export const desktopAlerts = {
  supported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  },
  enabled(): boolean {
    try {
      return this.supported() && window.localStorage.getItem(KEY) === "1" && Notification.permission === "granted";
    } catch {
      return false;
    }
  },
  setEnabled(on: boolean) {
    try {
      window.localStorage.setItem(KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
  },
  wanted(): boolean {
    try {
      return window.localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  },
};
