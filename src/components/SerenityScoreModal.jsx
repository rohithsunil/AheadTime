import React from "react";
import { X, Sparkles, AlertTriangle, CalendarClock } from "lucide-react";
import { getDaysLeft, getStatus, formatCountdown, formatDate, STATUS_CONFIG } from "@/lib/renewalUtils";
import { getIconComponent, getColorClass } from "@/lib/categoryUtils";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// Shows what's pulling down the serenity score — overdue + urgent items.
// Tapping an item navigates to its detail page.
export default function SerenityScoreModal({ score, items, categories, onClose }) {
  const navigate = useNavigate();

  // Items that need attention: overdue or within 30 days (7 for subscriptions)
  const attentionItems = items
    .map((d) => ({ ...d, _daysLeft: getDaysLeft(d.expiry_date) }))
    .filter((d) => {
      if (d._daysLeft === null) return false;
      if (d._daysLeft < 0) return true; // overdue
      if (d._type === "subscription") return d._daysLeft <= 7;
      return d._daysLeft <= 30;
    })
    .sort((a, b) => (a._daysLeft ?? 9999) - (b._daysLeft ?? 9999));

  const overdueCount = attentionItems.filter((d) => d._daysLeft < 0).length;
  const urgentCount = attentionItems.filter((d) => d._daysLeft >= 0).length;

  const scoreColor = score >= 80 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-sm glass-frost rounded-t-3xl sm:rounded-3xl p-5 animate-spring-in max-h-[85vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">Serenity Score</p>
              <p className={cn("text-2xl font-display leading-none tabular-nums", scoreColor)}>{score}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-2 mb-4">
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-rose-700 dark:text-rose-400 text-xs font-medium">{overdueCount} overdue</span>
            </div>
          )}
          {urgentCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40">
              <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-700 dark:text-amber-400 text-xs font-medium">{urgentCount} upcoming</span>
            </div>
          )}
          {attentionItems.length === 0 && (
            <p className="text-muted-foreground text-sm">Everything is on track — nothing needs attention.</p>
          )}
        </div>

        {/* Items list */}
        {attentionItems.length > 0 && (
          <div className="space-y-2">
            {attentionItems.map((item) => {
              const status = getStatus(item._daysLeft, item._type);
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.safe;
              const catMatch = categories.find((c) => c.name === item.category);
              const Icon = item.custom_icon ? getIconComponent(item.custom_icon) : catMatch ? getIconComponent(catMatch.icon) : item._type === "subscription" ? getIconComponent("Repeat") : getIconComponent("FileText");
              const itemColor = catMatch ? getColorClass(catMatch.color) : "bg-slate-400";
              const detail = item._type === "voucher" && item.store ? item.store : item.category || item._type;
              return (
                <button
                  key={item.id}
                  onClick={() => { onClose(); navigate(`/document/${item.id}?type=${item._type}`); }}
                  className="w-full glass-frost rounded-2xl p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform relative overflow-hidden"
                >
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", cfg.dot)} />
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ml-1", itemColor)}>
                    {item.custom_image_url ? <img src={item.custom_image_url} alt="" className="w-full h-full object-cover rounded-xl" /> : <Icon className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium text-sm truncate">{item.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5 truncate capitalize">{detail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-xs font-semibold", cfg.accent)}>{formatCountdown(item._daysLeft)}</p>
                    <p className="text-muted-foreground text-[10px] mt-0.5">{formatDate(item.expiry_date)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}