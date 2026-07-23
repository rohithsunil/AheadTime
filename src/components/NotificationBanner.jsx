import React, { useState } from "react";
import { Bell, X, Settings as SettingsIcon } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { setNotificationSetting, openNotificationSettings } from "@/lib/reminderChecker";
import { toast } from "@/components/ui/use-toast";

export default function NotificationBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("aheadtime-notif-dismissed") === "true");
  const { subscribe } = usePushNotifications();
  const [enabling, setEnabling] = useState(false);

  if (dismissed) return null;

  const permission = typeof Notification !== "undefined" ? Notification.permission : "default";

  // Don't show if permission is already granted
  if (permission === "granted") return null;

  const isDenied = permission === "denied";

  const handleEnable = async () => {
    if (isDenied) {
      openNotificationSettings();
      return;
    }
    setEnabling(true);
    const res = await subscribe();
    if (res.success) {
      setNotificationSetting(true);
      localStorage.removeItem("aheadtime-notif-dismissed");
      setDismissed(true);
      toast({ title: "Notifications enabled 🔔", description: "You are now registered to receive push notifications.", variant: "success" });
    } else {
      toast({ title: "Notification alert", description: res.error || "Permission was not granted.", variant: "destructive" });
    }
    setEnabling(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("aheadtime-notif-dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="glass-frost rounded-2xl p-4 flex items-center gap-3 animate-fade-in" style={{ background: "rgba(255,140,66,0.08)" }}>
      <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center shrink-0">
        <Bell className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-medium">{isDenied ? "Notifications blocked" : "Enable reminders"}</p>
        <p className="text-muted-foreground text-xs mt-0.5">
          {isDenied
            ? "Open settings to allow notifications for this app."
            : "Get alerts before renewals expire so you never miss a deadline."}
        </p>
      </div>
      <button
        onClick={handleEnable}
        disabled={enabling}
        className="accent-gradient text-white rounded-full px-4 py-2 text-xs font-semibold shrink-0 active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-1"
      >
        {isDenied ? <><SettingsIcon className="w-3 h-3" /> Settings</> : enabling ? "..." : "Enable"}
      </button>
      <button onClick={handleDismiss} className="w-7 h-7 rounded-full hover:bg-foreground/5 flex items-center justify-center shrink-0">
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}