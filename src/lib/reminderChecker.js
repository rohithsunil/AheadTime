import { getDaysLeft } from "./renewalUtils";

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    // Must be called within a user gesture — the toggle click provides that.
    // Some Android PWA / WebView contexts silently reject without throwing,
    // so we handle both "denied" and "default" (prompt blocked) as failures.
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch (e) {
    return false;
  }
}

export function getNotificationSetting() {
  return localStorage.getItem("aheadtime-notifications") === "true";
}

export function setNotificationSetting(enabled) {
  localStorage.setItem("aheadtime-notifications", enabled ? "true" : "false");
}

// Returns the current notification permission state ("granted", "denied", "default", or "unsupported")
export function getNotificationPermission() {
  if (typeof Notification === "undefined") {
    // Some Android browsers/WebView don't expose Notification but do support
    // push via service workers — treat as "default" so we can try requesting.
    if ("PushManager" in window && "serviceWorker" in navigator) return "default";
    return "unsupported";
  }
  return Notification.permission;
}

// Opens the browser/OS notification settings for the app.
// Returns a string with manual instructions if it can't open settings directly.
export function openNotificationSettings() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isIOS) {
    // iOS PWA: app-settings: scheme opens the app's iOS settings page
    try {
      window.location.href = "app-settings:";
      return null;
    } catch {
      return "Go to iOS Settings → the AheadTime app → Notifications → Allow Notifications.";
    }
  }

  // Android PWA: the OS notification settings can sometimes be opened directly.
  // Otherwise provide step-by-step instructions.
  if (isAndroid) {
    if (isPWA) {
      return "Long-press the AheadTime app icon → App info → Notifications → Allow notifications.";
    }
    return "Chrome ⋮ → Settings → Site settings → Notifications → allow this site.";
  }
  return "Browser Settings → Privacy & Security → Site Settings → Notifications → allow this site.";
}

export async function checkReminders(documents) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!getNotificationSetting()) return;

  const notified = JSON.parse(localStorage.getItem("aheadtime-notified") || "{}");
  let updated = false;

  for (const doc of documents) {
    if (doc.archived) continue;
    const daysLeft = getDaysLeft(doc.expiry_date);
    if (daysLeft === null) continue;

    const reminders = doc.reminder_days && doc.reminder_days.length > 0 ? doc.reminder_days : [30, 7, 0];
    for (const days of reminders) {
      if (daysLeft === days) {
        const key = `${doc.id}-${days}-${doc.expiry_date}`;
        if (!notified[key]) {
          const message =
            days === 0
              ? `${doc.name} expires today!`
              : `${doc.name} expires in ${days} days.`;
          try {
            new Notification("AheadTime Reminder", { body: message });
            notified[key] = true;
            updated = true;
          } catch (e) {
            // Notification might not work in all contexts
          }
        }
      }
    }
  }

  if (updated) localStorage.setItem("aheadtime-notified", JSON.stringify(notified));
}