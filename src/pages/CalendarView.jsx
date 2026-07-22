import { db } from '@/api/db';

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { getDaysLeft, getStatus, STATUS_CONFIG, formatCountdown, formatDate } from "@/lib/renewalUtils";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import EmptyState from "@/components/EmptyState";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

export default function CalendarView() {
  const navigate = useNavigate();
  const [view, setView] = useState("month"); // "month" | "timeline"
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
  });

  const { data: documents = [] } = useQuery({ queryKey: ["documents", "all"], queryFn: () => db.entities.Document.list() });
  const { data: subscriptions = [] } = useQuery({ queryKey: ["subscriptions", "all"], queryFn: () => db.entities.Subscription.list() });
  const { data: vouchers = [] } = useQuery({ queryKey: ["vouchers", "all"], queryFn: () => db.entities.Voucher.list() });

  const allItems = useMemo(() => [
    ...documents.map((d) => ({ ...d, _type: "document" })),
    ...subscriptions.map((s) => ({ ...s, _type: "subscription" })),
    ...vouchers.map((v) => ({ ...v, _type: "voucher" })),
  ], [documents, subscriptions, vouchers]);

  const activeItems = useMemo(() => allItems.filter((d) => !d.archived), [allItems]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Items grouped by date string (YYYY-MM-DD)
  const itemsByDate = useMemo(() => {
    const map = {};
    for (const item of activeItems) {
      if (!item.expiry_date) continue;
      if (!map[item.expiry_date]) map[item.expiry_date] = [];
      map[item.expiry_date].push(item);
    }
    return map;
  }, [activeItems]);

  const dateStr = (d) => d.toISOString().split("T")[0];

  // --- Month grid data ---
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();

  // --- Timeline (week strip) data ---
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const selectedItems = useMemo(() => {
    const key = dateStr(selectedDate);
    return itemsByDate[key] || [];
  }, [itemsByDate, selectedDate]);

  return (
    <Layout>
      <div className="min-h-screen pb-28 safe-top animate-route-in">
        <div className="px-5 lg:px-10 pt-12 pb-2">
          <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
            <div>
              <h1 className="text-foreground text-3xl lg:text-4xl font-display">Calendar</h1>
              <p className="text-muted-foreground text-sm mt-1">Renewals across the year</p>
            </div>
            {/* View toggle */}
            <div className="glass-frost rounded-full p-1 flex">
              <button
                onClick={() => setView("month")}
                className={cn("px-4 py-1.5 rounded-full text-xs font-medium transition-colors", view === "month" ? "accent-gradient text-white" : "text-muted-foreground")}
              >
                Month
              </button>
              <button
                onClick={() => setView("timeline")}
                className={cn("px-4 py-1.5 rounded-full text-xs font-medium transition-colors", view === "timeline" ? "accent-gradient text-white" : "text-muted-foreground")}
              >
                Timeline
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 lg:px-10 max-w-3xl mx-auto w-full mt-4 space-y-4">
          {view === "month" ? (
            <MonthGrid
              cursor={cursor}
              setCursor={setCursor}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              itemsByDate={itemsByDate}
              daysInMonth={daysInMonth}
              firstDayOfWeek={firstDayOfWeek}
              today={today}
              dateStr={dateStr}
              navigate={navigate}
            />
          ) : (
            <TimelineView
              weekDays={weekDays}
              setWeekStart={setWeekStart}
              weekStart={weekStart}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              itemsByDate={itemsByDate}
              dateStr={dateStr}
              today={today}
              selectedItems={selectedItems}
              navigate={navigate}
            />
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 px-2 pt-2">
            <LegendItem color="bg-rose-400" label="Overdue" />
            <LegendItem color="bg-amber-400" label="Soon" />
            <LegendItem color="bg-emerald-400" label="Safe" />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function MonthGrid({ cursor, setCursor, selectedDate, setSelectedDate, itemsByDate, daysInMonth, firstDayOfWeek, today, dateStr, navigate }) {
  const selectedKey = selectedDate ? dateStr(selectedDate) : null;

  const selectedItems = selectedDate ? (itemsByDate[dateStr(selectedDate)] || []) : [];

  return (
    <>
      <div className="glass-frost rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="w-9 h-9 rounded-full glass-frost flex items-center justify-center active:scale-95 transition-transform">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-foreground font-display text-2xl">{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</h2>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="w-9 h-9 rounded-full glass-frost flex items-center justify-center active:scale-95 transition-transform">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map((d) => <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const cellDate = new Date(cursor.getFullYear(), cursor.getMonth(), day);
            const key = dateStr(cellDate);
            const dayItems = itemsByDate[key] || [];
            const isToday = cellDate.getTime() === today.getTime();
            const isSelected = selectedKey === key;
            const hasUrgent = dayItems.some((d) => getStatus(getDaysLeft(d.expiry_date)) === "overdue");
            const hasWarn = dayItems.some((d) => ["urgent", "soon"].includes(getStatus(getDaysLeft(d.expiry_date))));
            return (
              <button key={day} onClick={() => setSelectedDate(cellDate)} className={cn("aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative", isSelected ? "accent-gradient shadow-md shadow-orange-500/20" : hasUrgent ? "bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50" : hasWarn ? "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50" : dayItems.length > 0 ? "bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40" : "hover:bg-foreground/5", isToday && !isSelected && "ring-1 ring-[#FF8C42]")}>
                <span className={cn("text-xs font-medium", isSelected ? "text-white" : isToday ? "text-[#FF8C42]" : "text-foreground")}>{day}</span>
                {dayItems.length > 0 && (
                  <div className="flex gap-1">
                    {dayItems.slice(0, 3).map((d, idx) => (
                      <div key={idx} className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white/80" : hasUrgent ? "bg-rose-400" : hasWarn ? "bg-amber-400" : "bg-emerald-400")} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="animate-fade-in">
          <h3 className="text-foreground font-semibold text-sm mb-2 px-1">
            {formatDate(dateStr(selectedDate))}
            {selectedItems.length > 0 && ` • ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""}`}
          </h3>
          {selectedItems.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No renewals" subtitle="Nothing due on this day." />
          ) : (
            <div className="space-y-2.5">
              {selectedItems.map((item) => {
                const dl = getDaysLeft(item.expiry_date);
                const cfg = STATUS_CONFIG[getStatus(dl)];
                const detail = item._type === "voucher" && item.store ? item.store : item.category || item._type;
                return (
                  <button key={item.id} onClick={() => navigate(`/document/${item.id}?type=${item._type}`)} className="w-full glass-frost rounded-2xl p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform relative overflow-hidden">
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", cfg.dot)} />
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.dot)}>
                      <CalendarDays className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5 capitalize">{detail}</p>
                    </div>
                    <p className={cn("text-xs font-semibold shrink-0", cfg.accent)}>{formatCountdown(dl)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function TimelineView({ weekDays, setWeekStart, weekStart, selectedDate, setSelectedDate, itemsByDate, dateStr, today, selectedItems, navigate }) {
  return (
    <>
      <div className="glass-frost rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setWeekStart(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 7))} className="w-9 h-9 rounded-full glass-frost flex items-center justify-center active:scale-95 transition-transform">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-foreground font-display text-xl">
            {MONTH_NAMES[weekDays[0].getMonth()].slice(0, 3)} {weekDays[0].getDate()} — {MONTH_NAMES[weekDays[6].getMonth()].slice(0, 3)} {weekDays[6].getDate()}
          </h2>
          <button onClick={() => setWeekStart(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7))} className="w-9 h-9 rounded-full glass-frost flex items-center justify-center active:scale-95 transition-transform">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
        {/* Week strip */}
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((d, i) => {
            const key = dateStr(d);
            const dayItems = itemsByDate[key] || [];
            const isToday = d.getTime() === today.getTime();
            const isSelected = selectedDate && selectedDate.getTime() === d.getTime();
            const hasUrgent = dayItems.some((d) => getStatus(getDaysLeft(d.expiry_date)) === "overdue");
            const hasWarn = dayItems.some((d) => ["urgent", "soon"].includes(getStatus(getDaysLeft(d.expiry_date))));
            return (
              <button key={i} onClick={() => setSelectedDate(new Date(d))} className={cn("flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all relative", isSelected ? "accent-gradient shadow-md shadow-orange-500/20" : hasUrgent ? "bg-rose-50 dark:bg-rose-950/30" : hasWarn ? "bg-amber-50 dark:bg-amber-950/30" : dayItems.length > 0 ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-foreground/5")}>
                <span className={cn("text-[10px] font-medium", isSelected ? "text-white/80" : "text-muted-foreground")}>{DAY_NAMES_SHORT[i]}</span>
                <span className={cn("text-base font-display leading-none", isSelected ? "text-white" : isToday ? "text-[#FF8C42]" : "text-foreground")}>{d.getDate()}</span>
                {dayItems.length > 0 && <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : hasUrgent ? "bg-rose-400" : hasWarn ? "bg-amber-400" : "bg-emerald-400")} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline events for selected day */}
      <div className="animate-fade-in">
        <h3 className="text-foreground font-semibold text-sm mb-2 px-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          {selectedDate && formatDate(dateStr(selectedDate))}
          {selectedItems.length > 0 && ` • ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""}`}
        </h3>
        {selectedItems.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nothing scheduled" subtitle="No renewals due on this day." />
        ) : (
          <div className="space-y-2.5">
            {selectedItems.map((item) => {
              const dl = getDaysLeft(item.expiry_date);
              const cfg = STATUS_CONFIG[getStatus(dl)];
              const detail = item._type === "voucher" && item.store ? item.store : item.category || item._type;
              return (
                <button key={item.id} onClick={() => navigate(`/document/${item.id}?type=${item._type}`)} className={cn("w-full glass-frost rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform", cfg.glow)}>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.dot)}>
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5 capitalize">{detail}</p>
                  </div>
                  <p className={cn("text-xs font-semibold shrink-0", cfg.accent)}>{formatCountdown(dl)}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2 h-2 rounded-full", color)} />
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}