// Offline-first streak tracking using localStorage.
// A streak day = the app was opened that day (resets at LOCAL midnight).

const STREAK_KEY = "aheadtime-streak";

function read() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { count: 0, lastOpen: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lastOpen: null };
  }
}

function write(data) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// Local date string (YYYY-MM-DD) based on user's timezone — midnight is LOCAL midnight.
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function diffDays(a, b) {
  if (!a || !b) return Infinity;
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

// Called once per app open. Returns the new streak count.
export function recordStreakOpen() {
  const today = todayStr();
  const { count, lastOpen } = read();

  if (lastOpen === today) return count; // already counted today

  const gap = diffDays(lastOpen, today);
  let newCount;
  if (lastOpen === null) {
    newCount = 1;
  } else if (gap === 1) {
    newCount = count + 1;
  } else {
    newCount = 1; // streak broken
  }

  write({ count: newCount, lastOpen: today });
  return newCount;
}

export function getStreak() {
  return read().count;
}

export function hasOpenedToday() {
  const today = todayStr();
  const { lastOpen } = read();
  return lastOpen === today;
}

// Time remaining until local midnight (when the next streak day begins).
export function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // next local midnight (00:00)
  const diff = midnight - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, totalMs: diff };
}

// Best streak ever (optional — track in localStorage too)
const BEST_KEY = "aheadtime-best-streak";
export function getBestStreak() {
  try {
    return parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

export function updateBestStreak(current) {
  try {
    const best = getBestStreak();
    if (current > best) localStorage.setItem(BEST_KEY, String(current));
  } catch {
    // ignore
  }
}