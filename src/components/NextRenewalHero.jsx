import React from "react";
import { ChevronRight } from "lucide-react";
import { getDaysLeft, getStatus, STATUS_CONFIG, formatDate } from "@/lib/renewalUtils";
import { getIconComponent } from "@/lib/categoryUtils";
import { preloadImage } from "@/components/CustomIcon";

function getRenewalProgress(item) {
  const daysLeft = getDaysLeft(item.expiry_date);
  if (daysLeft === null) return 0;

  let totalDays;
  switch (item.recurrence_type) {
    case "Monthly": totalDays = 30; break;
    case "Quarterly": totalDays = 90; break;
    case "Semi-annual": totalDays = 180; break;
    case "Annual": totalDays = 365; break;
    case "Biennial": totalDays = 730; break;
    default:
      if (item.created_date) {
        const created = new Date(item.created_date);
        const expiry = new Date(item.expiry_date);
        totalDays = Math.max(Math.round((expiry - created) / (1000 * 60 * 60 * 24)), 1);
      } else {
        totalDays = 365;
      }
  }

  const elapsed = totalDays - Math.max(daysLeft, 0);
  return Math.min(Math.max(elapsed / totalDays, 0), 1);
}

const STATUS_GRADIENTS = {
  overdue: "linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)",
  urgent: "linear-gradient(135deg, #FF8C42 0%, #F0708E 100%)",
  soon: "linear-gradient(135deg, #FFB088 0%, #F0A8C8 100%)",
  safe: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
  unknown: "linear-gradient(135deg, #94A3B8 0%, #64748B 100%)",
};

export default function NextRenewalHero({ item, categories = [], onClick }) {
  // Preload custom image for instant display — must run before any early return
  const customImageUrl = item?.custom_image_url;
  React.useEffect(() => {
    if (customImageUrl) preloadImage(customImageUrl);
  }, [customImageUrl]);

  if (!item) return null;

  const daysLeft = getDaysLeft(item.expiry_date);
  const status = getStatus(daysLeft);
  const cfg = STATUS_CONFIG[status];
  const progress = getRenewalProgress(item);
  const gradient = STATUS_GRADIENTS[status] || STATUS_GRADIENTS.unknown;

  const catMatch = categories.find((c) => c.name === item.category);
  const hasCustomImage = !!item.custom_image_url;
  const Icon = item.custom_icon
    ? getIconComponent(item.custom_icon)
    : catMatch
    ? getIconComponent(catMatch.icon)
    : null;

  const RING_RADIUS = 26;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const ringOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-3xl p-5 text-left active:scale-[0.98] transition-transform relative overflow-hidden"
      style={{ background: gradient }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-12 -left-4 w-24 h-24 rounded-full bg-white/5" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">Next Renewal</p>
          <h2 className="text-white text-xl font-display leading-tight mt-1 line-clamp-2">{item.name}</h2>
          <p className="text-white/60 text-xs mt-0.5">{item.category}</p>

          <div className="flex items-baseline gap-1.5 mt-3">
            <span className="text-white text-3xl font-display tabular-nums leading-none whitespace-nowrap">
              {daysLeft !== null && daysLeft < 0 ? Math.abs(daysLeft) : daysLeft}
            </span>
            <span className="text-white/70 text-xs whitespace-nowrap">
              {daysLeft !== null && daysLeft < 0 ? "days overdue" : "days left"}
            </span>
          </div>
          <p className="text-white/50 text-[11px] mt-1 whitespace-nowrap">{formatDate(item.expiry_date)}</p>
        </div>

        {/* Circular progress ring */}
        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
            <circle
              cx="32" cy="32" r={RING_RADIUS} fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              className="transition-all duration-1000"
            />
          </svg>
          {hasCustomImage ? (
            <img src={item.custom_image_url} alt="" loading="eager" decoding="async" fetchPriority="high" className="w-10 h-10 rounded-full object-cover relative" />
          ) : Icon ? (
            <Icon className="w-7 h-7 text-white relative" strokeWidth={1.8} />
          ) : (
            <span className="text-white text-xs font-medium relative">{Math.round(progress * 100)}%</span>
          )}
        </div>
      </div>

      <div className="relative flex items-center justify-between mt-4 pt-3 border-t border-white/15">
        <span className="text-white/70 text-xs font-medium">{cfg.label}</span>
        <div className="flex items-center gap-1">
          <span className="text-white text-xs font-medium">View details</span>
          <ChevronRight className="w-3.5 h-3.5 text-white/70" />
        </div>
      </div>
    </button>
  );
}