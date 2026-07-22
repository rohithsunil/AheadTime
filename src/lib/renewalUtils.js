export const CATEGORIES = [
  { value: "Govt ID", icon: "IdCard", color: "bg-blue-500" },
  { value: "Subscription", icon: "Repeat", color: "bg-purple-500" },
  { value: "Bill", icon: "Receipt", color: "bg-amber-500" },
  { value: "Loan", icon: "Landmark", color: "bg-indigo-500" },
  { value: "Warranty", icon: "ShieldCheck", color: "bg-teal-500" },
  { value: "Insurance", icon: "Umbrella", color: "bg-emerald-500" },
  { value: "Membership", icon: "BadgeCheck", color: "bg-pink-500" },
  { value: "Education", icon: "GraduationCap", color: "bg-orange-500" },
  { value: "Health", icon: "HeartPulse", color: "bg-rose-500" },
  { value: "Other", icon: "FileText", color: "bg-slate-500" },
];

export function getDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry - today;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function getStatus(daysLeft, itemType) {
  if (daysLeft === null) return "unknown";
  if (daysLeft < 0) return "overdue";
  // Subscriptions are mostly auto-renewal — not urgent until 1 day before
  if (itemType === "subscription") {
    if (daysLeft <= 1) return "urgent";
    if (daysLeft <= 7) return "soon";
    return "safe";
  }
  if (daysLeft <= 30) return "urgent";
  if (daysLeft <= 60) return "soon";
  return "safe";
}

export const STATUS_CONFIG = {
  safe: {
    label: "Safe",
    dot: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    accent: "text-emerald-600 dark:text-emerald-400",
    ring: "stroke-emerald-400",
    glow: "bg-emerald-100 dark:bg-emerald-950/50",
  },
  soon: {
    label: "Soon",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    accent: "text-amber-600 dark:text-amber-400",
    ring: "stroke-amber-400",
    glow: "bg-amber-100 dark:bg-amber-950/50",
  },
  urgent: {
    label: "Urgent",
    dot: "bg-orange-400",
    badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
    accent: "text-orange-600 dark:text-orange-400",
    ring: "stroke-orange-400",
    glow: "bg-orange-100 dark:bg-orange-950/50",
  },
  overdue: {
    label: "Overdue",
    dot: "bg-rose-400",
    badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
    accent: "text-rose-600 dark:text-rose-400",
    ring: "stroke-rose-400",
    glow: "bg-rose-100 dark:bg-rose-950/50",
  },
  unknown: {
    label: "—",
    dot: "bg-slate-300 dark:bg-slate-600",
    badge: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    accent: "text-slate-500 dark:text-slate-400",
    ring: "stroke-slate-300",
    glow: "bg-slate-100 dark:bg-slate-800",
  },
};

export function formatCountdown(daysLeft) {
  if (daysLeft === null) return "—";
  if (daysLeft === 0) return "Expires today";
  if (daysLeft < 0) return `Overdue by ${Math.abs(daysLeft)}d`;
  if (daysLeft === 1) return "1 day left";
  return `${daysLeft} days left`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good Morning", emoji: "👋", isNight: false };
  if (hour >= 12 && hour < 16) return { text: "Good Afternoon", emoji: "👋", isNight: false };
  if (hour >= 16 && hour < 22) return { text: "Good Evening", emoji: "👋", isNight: false };
  return { text: "Good Night", emoji: "🌙", isNight: true };
}

export function computeNextExpiry(currentExpiry, recurrence) {
  if (!currentExpiry || recurrence === "One-time" || recurrence === "Custom") return "";
  const base = new Date(currentExpiry);
  switch (recurrence) {
    case "Monthly":
      base.setMonth(base.getMonth() + 1);
      break;
    case "Quarterly":
      base.setMonth(base.getMonth() + 3);
      break;
    case "Semi-annual":
      base.setMonth(base.getMonth() + 6);
      break;
    case "Annual":
      base.setFullYear(base.getFullYear() + 1);
      break;
    case "Biennial":
      base.setFullYear(base.getFullYear() + 2);
      break;
    default:
      return "";
  }
  return base.toISOString().split("T")[0];
}