import {
  FileText, IdCard, Repeat, Receipt, Landmark, ShieldCheck, Umbrella,
  BadgeCheck, GraduationCap, HeartPulse, Gift, Briefcase, Car,
  Plane, Home as HomeIcon, Smartphone, ShoppingBag, CreditCard, Wrench,
  Stethoscope, Dumbbell, BookOpen, Gamepad2, Music, Sparkles
} from "lucide-react";

// Map icon names → lucide components
export const ICON_MAP = {
  FileText, IdCard, Repeat, Receipt, Landmark, ShieldCheck, Umbrella,
  BadgeCheck, GraduationCap, HeartPulse, Gift, Briefcase, Car,
  Plane, Home: HomeIcon, Smartphone, ShoppingBag, CreditCard, Wrench,
  Stethoscope, Dumbbell, BookOpen, Gamepad2, Music, Sparkles,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

// Map color names → tailwind bg classes
export const COLOR_MAP = {
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  slate: "bg-slate-500",
  emerald: "bg-emerald-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  cyan: "bg-cyan-500",
};

export const COLOR_NAMES = Object.keys(COLOR_MAP);

export function getIconComponent(iconName) {
  return ICON_MAP[iconName] || FileText;
}

export function getColorClass(colorName) {
  return COLOR_MAP[colorName] || COLOR_MAP.slate;
}

// Default categories seeded for new users
export const DEFAULT_CATEGORIES = [
  { name: "Govt ID", icon: "IdCard", color: "blue", sort_order: 0 },
  { name: "Subscription", icon: "Repeat", color: "violet", sort_order: 1 },
  { name: "Bill", icon: "Receipt", color: "amber", sort_order: 2 },
  { name: "Loan", icon: "Landmark", color: "indigo", sort_order: 3 },
  { name: "Warranty", icon: "ShieldCheck", color: "teal", sort_order: 4 },
  { name: "Insurance", icon: "Umbrella", color: "emerald", sort_order: 5 },
  { name: "Membership", icon: "BadgeCheck", color: "pink", sort_order: 6 },
  { name: "Education", icon: "GraduationCap", color: "orange", sort_order: 7 },
  { name: "Health", icon: "HeartPulse", color: "rose", sort_order: 8 },
  { name: "Business", icon: "Briefcase", color: "cyan", sort_order: 9 },
  { name: "Gift Voucher", icon: "Gift", color: "purple", sort_order: 10 },
  { name: "Other", icon: "FileText", color: "slate", sort_order: 11 },
];