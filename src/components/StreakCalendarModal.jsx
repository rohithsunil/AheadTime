import React, { useMemo, useState } from "react";
import { X, Flame, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStreakLevel } from "@/components/StreakRanks";
import StreakRanks from "@/components/StreakRanks";

function getActiveDays(streak) {
  const days = new Set();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < streak; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.add(d.toISOString().split("T")[0]);
  }
  return days;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

export default function StreakCalendarModal({ streak, best, onClose }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const activeDays = useMemo(() => getActiveDays(streak), [streak]);
  const level = getStreakLevel(streak);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDow = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(viewYear, viewMonth, d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const canGoNext = viewYear < today.getFullYear() || (viewYear === today.getFullYear() && viewMonth < today.getMonth());

  const monthStreakCount = calendarDays.filter(d => d && activeDays.has(d.toISOString().split("T")[0])).length;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-sm glass-frost rounded-t-3xl sm:rounded-3xl p-6 animate-spring-in max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl accent-gradient flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" fill={streak >= 7 ? "white" : "none"} />
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">{streak} day streak</p>
              <p className="text-muted-foreground text-xs">{level.emoji} {level.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {best > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40">
                <Trophy className="w-3 h-3 text-amber-500" />
                <span className="text-amber-700 dark:text-amber-400 text-[11px] font-medium">Best {best}</span>
              </div>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center active:scale-95 transition-transform">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="text-center">
            <p className="text-foreground font-semibold text-sm">{MONTH_NAMES[viewMonth]} {viewYear}</p>
            {monthStreakCount > 0 && (
              <p className="text-muted-foreground text-[11px]">{monthStreakCount} active day{monthStreakCount !== 1 ? "s" : ""}</p>
            )}
          </div>
          <button
            onClick={nextMonth}
            disabled={!canGoNext}
            className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1.5">
          {DAY_LABELS.map((l) => (
            <div key={l} className="text-center text-[10px] font-semibold text-muted-foreground/60 py-0.5">{l}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays.map((d, i) => {
            if (!d) return <div key={`pad-${i}`} />;
            const dateStr = d.toISOString().split("T")[0];
            const isActive = activeDays.has(dateStr);
            const isToday = d.getTime() === today.getTime();
            const isFuture = d > today;
            return (
              <div
                key={dateStr}
                style={{ animationDelay: `${i * 6}ms` }}
                className={cn(
                  "aspect-square flex items-center justify-center rounded-xl text-xs font-medium mx-0.5 animate-pop-in transition-all",
                  isActive && "accent-gradient text-white shadow-sm shadow-orange-300/40 dark:shadow-orange-800/40",
                  isToday && !isActive && "border-2 border-[#FF8C42]/50 text-foreground",
                  !isActive && !isToday && !isFuture && "text-foreground/40",
                  isFuture && "text-foreground/20"
                )}
              >
                {isActive ? <Flame className="w-3.5 h-3.5" fill="white" /> : d.getDate()}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-lg accent-gradient flex items-center justify-center">
              <Flame className="w-3 h-3 text-white" fill="white" />
            </div>
            <span className="text-xs text-muted-foreground">Streak day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-lg border-2 border-[#FF8C42]/50" />
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
        </div>

        {/* Rank ladder — shows all levels so users see progression */}
        <div className="mt-5 pt-4 border-t border-border">
          <StreakRanks streak={streak} />
        </div>
      </div>
    </div>
  );
}