import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, formatCountdown, formatDate } from "@/lib/renewalUtils";
import CustomIcon from "@/components/CustomIcon";

// Shared zen-style item row — replaces stress-inducing dots with category icons
// Props: item (with _type, _daysLeft, name, category, expiry_date, store), categories[], onClick, showChevron
export default function ItemRow({ item, categories = [], onClick, showChevron = true, compact = false }) {
  const cfg = STATUS_CONFIG[getStatus(item._daysLeft)];

  const detail = item._type === "voucher" && item.store
    ? item.store
    : item.category || (item._type === "subscription" ? "Subscription" : item._type === "voucher" ? "Voucher" : "Other");

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full glass-frost rounded-2xl flex items-center gap-3 text-left active:scale-[0.98] transition-transform",
        compact ? "p-3" : "p-3.5"
      )}
    >
      {/* Zen icon — category-colored rounded square with custom icon/image support */}
      <CustomIcon item={item} categories={categories} />

      {/* Name + meta — full width, no truncation on name */}
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-medium text-sm leading-snug line-clamp-2">{item.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-muted-foreground text-xs truncate">{detail}</span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(item.expiry_date)}</span>
        </div>
      </div>

      {/* Countdown — right aligned, never wraps */}
      <div className="flex flex-col items-end shrink-0">
        <span className={cn("text-xs font-semibold whitespace-nowrap", cfg.accent)}>{formatCountdown(item._daysLeft)}</span>
        {showChevron && <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />}
      </div>
    </button>
  );
}

function getStatus(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return "unknown";
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 30) return "urgent";
  if (daysLeft <= 60) return "soon";
  return "safe";
}