// User-customizable filter preferences — controls which filter bars are always
// visible on the Documents page vs. only in the "All Filters" sheet.

const PREFS_KEY = "aheadtime-filter-prefs";

const DEFAULT_PREFS = {
  urgency: true,   // urgency pills (All, Overdue, Urgent, Soon, Safe)
  sort: true,     // sort options (Soonest, Recent, A-Z)
  tags: false,    // tags filter bar
  archived: false, // archived toggle
};

export function getFilterPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setFilterPrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function toggleFilterPref(key) {
  const prefs = getFilterPrefs();
  const updated = { ...prefs, [key]: !prefs[key] };
  setFilterPrefs(updated);
  return updated;
}