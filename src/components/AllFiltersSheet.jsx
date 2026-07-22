import React, { useState } from "react";
import { SlidersHorizontal, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { getFilterPrefs, setFilterPrefs } from "@/lib/filterPrefs";

const URGENCY_FILTERS = ["All", "Overdue", "Urgent", "Soon", "Safe"];
const SORT_OPTIONS = [
  { value: "expiry", label: "Soonest expiry" },
  { value: "recent", label: "Recently added" },
  { value: "alpha", label: "A–Z" },
];

const PREF_LABELS = {
  urgency: { label: "Urgency", desc: "All, Overdue, Urgent, Soon, Safe" },
  sort: { label: "Sort", desc: "Soonest, Recent, A–Z" },
  tags: { label: "Tags", desc: "Filter by tags" },
  archived: { label: "Archived", desc: "Show archived toggle" },
};

// Full filter sheet — shows ALL filter options + customization toggles
export default function AllFiltersSheet({
  urgency, setUrgency,
  sortBy, setSortBy,
  showArchived, setShowArchived,
  selectedTag, setSelectedTag,
  allTags = [],
  urgencyCounts = {},
  onPrefsChange,
  onClose,
}) {
  const [prefs, setPrefs] = useState(() => getFilterPrefs());
  const [section, setSection] = useState("filters"); // "filters" | "customize"

  const handleTogglePref = (key) => {
    haptic(8);
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setFilterPrefs(updated);
    if (onPrefsChange) onPrefsChange(updated);
  };

  const handleSelect = (fn, value) => {
    haptic(8);
    fn(value);
  };

  return (
    <div className="fixed inset-0 z-[65] bg-black/40 flex items-end animate-fade-in" onClick={onClose}>
      <div
        className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-3xl mx-auto max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-foreground/15 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-foreground font-semibold text-base">All Filters</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Section toggle */}
        <div className="flex items-center gap-1 p-1 glass-frost rounded-xl mb-4">
          <button
            onClick={() => { haptic(8); setSection("filters"); }}
            className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
              section === "filters" ? "accent-gradient text-white" : "text-muted-foreground")}
          >
            Filters
          </button>
          <button
            onClick={() => { haptic(8); setSection("customize"); }}
            className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
              section === "customize" ? "accent-gradient text-white" : "text-muted-foreground")}
          >
            Customize
          </button>
        </div>

        {section === "filters" ? (
          <div className="space-y-4">
            {/* Urgency */}
            <FilterGroup label="Urgency">
              <div className="flex flex-wrap gap-2">
                {URGENCY_FILTERS.map((u) => (
                  <button
                    key={u}
                    onClick={() => handleSelect(setUrgency, u)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95",
                      urgency === u ? "bg-foreground text-background" : "bg-foreground/8 text-foreground/70"
                    )}
                  >
                    {u}
                    {urgencyCounts[u] > 0 && <span className="ml-1 opacity-60 tabular-nums">{urgencyCounts[u]}</span>}
                  </button>
                ))}
              </div>
            </FilterGroup>

            {/* Sort */}
            <FilterGroup label="Sort">
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(setSortBy, opt.value)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95",
                      sortBy === opt.value ? "bg-foreground text-background" : "bg-foreground/8 text-foreground/70"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </FilterGroup>

            {/* Tags */}
            {allTags.length > 0 && (
              <FilterGroup label="Tags">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSelect(setSelectedTag, "")}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95",
                      !selectedTag ? "bg-foreground text-background" : "bg-foreground/8 text-foreground/70"
                    )}
                  >
                    All tags
                  </button>
                  {allTags.map((t) => (
                    <button
                      key={t}
                      onClick={() => handleSelect(setSelectedTag, t)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95",
                        selectedTag === t ? "accent-gradient text-white" : "bg-foreground/8 text-foreground/70"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </FilterGroup>
            )}

            {/* Archived */}
            <FilterGroup label="Archived">
              <button
                onClick={() => handleSelect(setShowArchived, !showArchived)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95",
                  showArchived ? "bg-foreground text-background" : "bg-foreground/8 text-foreground/70"
                )}
              >
                {showArchived ? "Showing archived" : "Show archived"}
              </button>
            </FilterGroup>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs mb-2">Choose which filters stay visible on the Documents page for quick access.</p>
            {Object.entries(PREF_LABELS).map(([key, info]) => (
              <button
                key={key}
                onClick={() => handleTogglePref(key)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-foreground/5 transition-colors text-left"
              >
                <div className="flex-1">
                  <p className="text-foreground text-sm font-medium">{info.label}</p>
                  <p className="text-muted-foreground text-xs">{info.desc}</p>
                </div>
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  prefs[key] ? "accent-gradient" : "bg-foreground/10"
                )}>
                  {prefs[key] ? <Eye className="w-4 h-4 text-white" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">{label}</p>
      {children}
    </div>
  );
}