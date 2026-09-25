"use client";

import { useEffect, useState } from "react";
import { desktopAlerts } from "@/utils/desktopAlerts";
import { Switch } from "../ui/Field";

export function DesktopAlertsSetting() {
  const [supported, setSupported] = useState(true);
  const [on, setOn] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const ok = desktopAlerts.supported();
    setSupported(ok);
    if (ok) {
      setPermission(Notification.permission);
      setOn(desktopAlerts.wanted() && Notification.permission === "granted");
    }
  }, []);

  async function toggle(next: boolean) {
    if (!next) {
      desktopAlerts.setEnabled(false);
      setOn(false);
      return;
    }
    const result = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    setPermission(result);
    desktopAlerts.setEnabled(result === "granted");
    setOn(result === "granted");
  }

  if (!supported) return <p className="text-base text-fg-3">This browser doesn&apos;t support system notifications.</p>;

  return (
    <div>
      <Switch checked={on} onChange={toggle} label="Show desktop alerts" disabled={permission === "denied"} />
      <p className="mt-2 text-sm text-fg-3">
        {permission === "denied"
          ? "Notifications are blocked for this site. Allow them in your browser's site settings, then try again."
          : "Alerts appear when a recurring expense is due or someone adds you to a bill. You'll always see them on the Notifications page."}
      </p>
    </div>
  );
}
