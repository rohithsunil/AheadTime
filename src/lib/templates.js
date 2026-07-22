export const TEMPLATES = [
  { name: "Passport", category: "Govt ID", recurrence: "Custom", fee: 110, checklist: "Book appointment\nBring old passport\nPhotos\nFee payment" },
  { name: "Driver's License", category: "Govt ID", recurrence: "Custom", fee: 35 },
  { name: "Car Insurance", category: "Insurance", recurrence: "Annual", fee: 850, checklist: "Compare 3 quotes\nCheck coverage limits\nConfirm no-claims bonus" },
  { name: "Health Insurance", category: "Insurance", recurrence: "Annual", fee: 1200 },
  { name: "Home Insurance", category: "Insurance", recurrence: "Annual", fee: 600 },
  { name: "Netflix", category: "Subscription", recurrence: "Monthly", fee: 15.99 },
  { name: "Spotify", category: "Subscription", recurrence: "Monthly", fee: 9.99 },
  { name: "Amazon Prime", category: "Subscription", recurrence: "Annual", fee: 139 },
  { name: "iCloud Storage", category: "Subscription", recurrence: "Monthly", fee: 2.99 },
  { name: "Gym Membership", category: "Membership", recurrence: "Monthly", fee: 50 },
  { name: "Internet Bill", category: "Bill", recurrence: "Monthly", fee: 60 },
  { name: "Electricity Bill", category: "Bill", recurrence: "Monthly", fee: 120 },
  { name: "Water Bill", category: "Bill", recurrence: "Quarterly", fee: 80 },
  { name: "Laptop Warranty", category: "Warranty", recurrence: "One-time" },
  { name: "Phone Warranty", category: "Warranty", recurrence: "One-time" },
  { name: "Student Loan", category: "Loan", recurrence: "Monthly" },
  { name: "Car Loan", category: "Loan", recurrence: "Monthly" },
  { name: "Domain Name", category: "Subscription", recurrence: "Annual", fee: 12 },
  { name: "Professional License", category: "Education", recurrence: "Annual", fee: 200 },
  { name: "First Aid Certificate", category: "Education", recurrence: "Biennial" },
];

export const DEFAULT_REMINDER_DAYS = [30, 7, 0];
export const REMINDER_PRESETS = [
  { label: "Default (30/7/0)", days: [30, 7, 0] },
  { label: "Early bird (60/30/14/7/1)", days: [60, 30, 14, 7, 1] },
  { label: "Minimal (7/0)", days: [7, 0] },
  { label: "Last minute (3/1/0)", days: [3, 1, 0] },
];

export const PROFILE_COLORS = {
  rose: { bg: "bg-rose-400", text: "text-rose-600 dark:text-rose-400", tint: "bg-rose-50 dark:bg-rose-950/50" },
  amber: { bg: "bg-amber-400", text: "text-amber-600 dark:text-amber-400", tint: "bg-amber-50 dark:bg-amber-950/50" },
  teal: { bg: "bg-teal-400", text: "text-teal-600 dark:text-teal-400", tint: "bg-teal-50 dark:bg-teal-950/50" },
  violet: { bg: "bg-violet-400", text: "text-violet-600 dark:text-violet-400", tint: "bg-violet-50 dark:bg-violet-950/50" },
  blue: { bg: "bg-blue-400", text: "text-blue-600 dark:text-blue-400", tint: "bg-blue-50 dark:bg-blue-950/50" },
  orange: { bg: "bg-orange-400", text: "text-orange-600 dark:text-orange-400", tint: "bg-orange-50 dark:bg-orange-950/50" },
  pink: { bg: "bg-pink-400", text: "text-pink-600 dark:text-pink-400", tint: "bg-pink-50 dark:bg-pink-950/50" },
  slate: { bg: "bg-slate-400", text: "text-slate-600 dark:text-slate-400", tint: "bg-slate-50 dark:bg-slate-800" },
};