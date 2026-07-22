import React, { useState, useEffect } from "react";
import { Flame, Trophy, X } from "lucide-react";
import { getTimeUntilMidnight, hasOpenedToday } from "@/lib/streakUtils";

const STREAK_LEVELS = [
  { min: 1, max: 6, level: 1, name: "Sprout", emoji: "🌱" },
  { min: 7, max: 13, level: 2, name: "Spark", emoji: "✨" },
  { min: 14, max: 29, level: 3, name: "Steady", emoji: "🌿" },
  { min: 30, max: 59, level: 4, name: "Flame Keeper", emoji: "🔥" },
  { min: 60, max: 99, level: 5, name: "Zen Master", emoji: "🧘" },
  { min: 100, max: Infinity, level: 6, name: "Sage", emoji: "🏔️" },
];

function getStreakLevel(streak) {
  return STREAK_LEVELS.find((l) => streak >= l.min && streak <= l.max) || STREAK_LEVELS[0];
}

export default function StreakPopover({ streak, best, onClose }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeUntilMidnight());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const level = getStreakLevel(streak);
  const openedToday = hasOpenedToday();
  const nextLevel = STREAK_LEVELS.find((l) => l.level === level.level + 1);

  const hh = String(timeLeft.hours).padStart(2, "0");
  const mm = String(timeLeft.minutes).padStart(2, "0");
  const ss = String(timeLeft.seconds).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-8 animate-fade-in" onClick={onClose}>
      <div className="relative glass-frost rounded-3xl p-6 w-full max-w-xs text-center animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Flame icon */}
        <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/30">
          <Flame className="w-8 h-8 text-white" fill={streak >= 7 ? "white" : "none"} />
        </div>

        {/* Streak number */}
        <div>
          <span className="text-foreground text-5xl font-display leading-none tabular-nums">{streak}</span>
          <span className="text-muted-foreground text-sm ml-1">day{streak !== 1 ? "s" : ""}</span>
        </div>

        {/* Level badge */}
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/5 dark:bg-white/5">
          <span className="text-sm">{level.emoji}</span>
          <span className="text-xs font-medium text-foreground">{level.name}</span>
        </div>

        {/* Countdown timer */}
        <div className="mt-4 p-4 rounded-2xl bg-foreground/5 dark:bg-white/5">
          {openedToday ? (
            <>
              <p className="text-muted-foreground text-xs mb-1">Next streak day in</p>
              <p className="text-foreground text-3xl font-display tabular-nums tracking-tight">
                {hh}<span className="text-muted-foreground text-xl">h</span> {mm}<span className="text-muted-foreground text-xl">m</span>
              </p>
              <p className="text-muted-foreground/60 text-[10px] mt-0.5 tabular-nums">{ss}s</p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-2 font-medium">✓ Streak claimed today</p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-xs mb-1">Streak resets at midnight</p>
              <p className="text-foreground text-3xl font-display tabular-nums tracking-tight">
                {hh}<span className="text-muted-foreground text-xl">h</span> {mm}<span className="text-muted-foreground text-xl">m</span>
              </p>
              <p className="text-muted-foreground/60 text-[10px] mt-0.5 tabular-nums">{ss}s</p>
              <p className="text-[#FF8C42] dark:text-orange-400 text-xs mt-2 font-medium">Open daily to keep your streak!</p>
            </>
          )}
        </div>

        {/* Next level */}
        {nextLevel && (
          <p className="text-muted-foreground text-xs mt-3">
            {nextLevel.min - streak} day{nextLevel.min - streak !== 1 ? "s" : ""} to reach {nextLevel.name} {nextLevel.emoji}
          </p>
        )}

        {/* Best */}
        {best > 0 && (
          <div className="flex items-center gap-1.5 justify-center mt-2">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-400 text-xs font-medium">Best: {best} days</span>
          </div>
        )}
      </div>
    </div>
  );
}