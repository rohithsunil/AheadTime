import { db } from '@/api/db';

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, ChevronRight, X, RefreshCw, Bell, Archive, Trash2, FileText, CheckSquare, Square, Tag, SlidersHorizontal } from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useCategories } from "@/hooks/useCategories";
import { getDaysLeft, getStatus, STATUS_CONFIG, formatCountdown, formatDate, computeNextExpiry } from "@/lib/renewalUtils";
import { PROFILE_COLORS } from "@/lib/templates";
import { getFilterPrefs } from "@/lib/filterPrefs";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import Layout from "@/components/Layout";
import EmptyState from "@/components/EmptyState";
import AllFiltersSheet from "@/components/AllFiltersSheet";
import CustomIcon, { preloadImages } from "@/components/CustomIcon";

const URGENCY_FILTERS = ["All", "Overdue", "Urgent", "Soon", "Safe"];
const SORT_OPTIONS = [
  { value: "expiry", label: "Soonest expiry" },
  { value: "recent", label: "Recently added" },
  { value: "alpha", label: "A–Z" },
];

// Document sub-tabs
const DOC_TABS = [
  { key: "all", label: "All" },
  { key: "document", label: "Documents" },
  { key: "subscription", label: "Subscriptions" },
  { key: "voucher", label: "Vouchers" },
];

export default function Documents() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";
  const profileFilter = searchParams.get("profile") || "";
  const statFilter = searchParams.get("filter") || "";

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [urgency, setUrgency] = useState("All");
  const [sortBy, setSortBy] = useState("expiry");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");
  const [actionSheet, setActionSheet] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [docTab, setDocTab] = useState("all");
  const [allFiltersOpen, setAllFiltersOpen] = useState(false);
  const [filterPrefs, setFilterPrefs] = useState(() => getFilterPrefs());

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["documents", "all"],
    queryFn: () => db.entities.Document.list(),
  });
  const { data: subscriptions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["subscriptions", "all"],
    queryFn: () => db.entities.Subscription.list(),
  });
  const { data: vouchers = [], isLoading: vouchLoading } = useQuery({
    queryKey: ["vouchers", "all"],
    queryFn: () => db.entities.Voucher.list(),
  });
  const isLoading = docsLoading && subsLoading && vouchLoading;

  const allDocuments = useMemo(() => [
    ...documents.map((d) => ({ ...d, _type: "document" })),
    ...subscriptions.map((s) => ({ ...s, _type: "subscription" })),
    ...vouchers.map((v) => ({ ...v, _type: "voucher" })),
  ], [documents, subscriptions, vouchers]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", "all"],
    queryFn: () => db.entities.FamilyProfile.list(),
  });
  const { data: categories = [], invalidate: invalidateCategories } = useCategories();

  const queryClient = useQueryClient();

  // Preload all custom images for instant display
  useEffect(() => {
    preloadImages(allDocuments.map((d) => d.custom_image_url));
  }, [allDocuments]);

  const handleCarouselReorder = async (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = Array.from(categories);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    try {
      await db.entities.Category.bulkUpdate(
        reordered.map((cat, i) => ({ id: cat.id, sort_order: i }))
      );
      invalidateCategories();
    } catch (e) {
      toast({ title: "Failed to reorder categories", variant: "destructive" });
    }
  };

  const filtered = useMemo(() => {
    let result = allDocuments.filter((d) => (showArchived ? d.archived : !d.archived));
    if (profileFilter) result = result.filter((d) => d.profile_id === profileFilter);
    if (query.trim()) result = result.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));
    if (category !== "All") result = result.filter((d) => d.category === category);
    if (urgency !== "All") result = result.filter((d) => getStatus(getDaysLeft(d.expiry_date)) === urgency.toLowerCase());
    if (selectedTag) result = result.filter((d) => d.tags && d.tags.includes(selectedTag));
    // Sub-tab filter
    if (docTab !== "all") result = result.filter((d) => d._type === docTab);

    result = result.map((d) => ({ ...d, _daysLeft: getDaysLeft(d.expiry_date) }));

    if (statFilter === "week") result = result.filter((d) => d._daysLeft !== null && d._daysLeft >= 0 && d._daysLeft <= 7);
    else if (statFilter === "month") result = result.filter((d) => d._daysLeft !== null && d._daysLeft >= 0 && d._daysLeft <= 30);
    else if (statFilter === "overdue") result = result.filter((d) => d._daysLeft !== null && d._daysLeft < 0);

    if (sortBy === "expiry") result.sort((a, b) => (a._daysLeft ?? 9999) - (b._daysLeft ?? 9999));
    else if (sortBy === "recent") result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    else if (sortBy === "alpha") result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [allDocuments, query, category, urgency, sortBy, showArchived, profileFilter, statFilter, selectedTag, docTab]);

  const selectedProfile = profiles.find((p) => p.id === profileFilter);

  const allTags = useMemo(() => {
    const tagSet = new Set();
    allDocuments.forEach((d) => {
      if (d.tags) d.tags.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [allDocuments]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((d) => d.id)));
  const clearSelection = () => { setSelected(new Set()); setSelectMode(false); };

  const ENTITY_OF = { document: "Document", subscription: "Subscription", voucher: "Voucher" };
  const LISTKEY_OF = { document: "documents", subscription: "subscriptions", voucher: "vouchers" };

  const bulkArchive = async () => {
    const ids = new Set(selected);
    const selectedItems = filtered.filter((d) => ids.has(d.id));
    const prevs = {};
    ["documents", "subscriptions", "vouchers"].forEach((k) => { prevs[k] = queryClient.getQueryData([k, "all"]); });
    ["documents", "subscriptions", "vouchers"].forEach((k) => {
      queryClient.setQueryData([k, "all"], (old) =>
        (old || []).map((d) => (ids.has(d.id) ? { ...d, archived: true } : d))
      );
    });
    const count = ids.size;
    clearSelection();
    try {
      for (const doc of selectedItems) {
        const ent = ENTITY_OF[doc._type || "document"];
        await db.entities[ent].update(doc.id, { archived: true });
      }
      toast({ title: `${count} item${count !== 1 ? "s" : ""} archived`, variant: "success" });
    } catch (e) {
      Object.entries(prevs).forEach(([k, v]) => queryClient.setQueryData([k, "all"], v));
      toast({ title: "Failed to archive", variant: "destructive" });
    }
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["vouchers"] });
  };

  const bulkDelete = async () => {
    const ids = new Set(selected);
    const selectedItems = filtered.filter((d) => ids.has(d.id));
    const prevs = {};
    ["documents", "subscriptions", "vouchers"].forEach((k) => { prevs[k] = queryClient.getQueryData([k, "all"]); });
    ["documents", "subscriptions", "vouchers"].forEach((k) => {
      queryClient.setQueryData([k, "all"], (old) => (old || []).filter((d) => !ids.has(d.id)));
    });
    const count = ids.size;
    clearSelection();
    try {
      for (const doc of selectedItems) {
        const ent = ENTITY_OF[doc._type || "document"];
        await db.entities[ent].delete(doc.id);
      }
      toast({ title: `${count} item${count !== 1 ? "s" : ""} deleted`, variant: "destructive" });
    } catch (e) {
      Object.entries(prevs).forEach(([k, v]) => queryClient.setQueryData([k, "all"], v));
      toast({ title: "Failed to delete", variant: "destructive" });
    }
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["vouchers"] });
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["documents"] });
    await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
  };

  const { onTouchStart, onTouchEnd } = usePullToRefresh(handleRefresh);

  const bulkRenew = async () => {
    const ids = new Set(selected);
    const toRenew = filtered.filter((d) => ids.has(d.id) && d._type !== "voucher");
    const prevs = {};
    ["documents", "subscriptions"].forEach((k) => { prevs[k] = queryClient.getQueryData([k, "all"]); });
    ["documents", "subscriptions"].forEach((k) => {
      queryClient.setQueryData([k, "all"], (old) =>
        (old || []).map((d) => {
          if (!ids.has(d.id)) return d;
          const next = computeNextExpiry(d.expiry_date, d.recurrence_type);
          return next ? { ...d, expiry_date: next, snoozed_until: null } : d;
        })
      );
    });
    const count = toRenew.length;
    clearSelection();
    try {
      for (const doc of toRenew) {
        const next = computeNextExpiry(doc.expiry_date, doc.recurrence_type);
        if (next) {
          const ent = ENTITY_OF[doc._type || "document"];
          console.log("[RenewalHistory] Creating:", { doc: doc.name, prev: doc.expiry_date, next });
          await db.entities.RenewalHistory.create({
            document_id: doc.id, document_name: doc.name,
            renewed_date: new Date().toISOString().split("T")[0],
            previous_expiry: doc.expiry_date, new_expiry: next,
          });
          console.log("[RenewalHistory] ✅ Created for:", doc.name);
          await db.entities[ent].update(doc.id, { expiry_date: next, snoozed_until: null });
        }
      }
      toast({ title: `${count} item${count !== 1 ? "s" : ""} renewed`, variant: "success" });
    } catch (e) {
      Object.entries(prevs).forEach(([k, v]) => queryClient.setQueryData([k, "all"], v));
      toast({ title: "Failed to renew", variant: "destructive" });
    }
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
  };

  // Urgency pill colors
  const urgencyColors = {
    All: { active: "bg-foreground text-background", inactive: "bg-foreground/8 text-foreground/70" },
    Overdue: { active: "bg-rose-500 text-white", inactive: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400" },
    Urgent: { active: "bg-orange-500 text-white", inactive: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400" },
    Soon: { active: "bg-amber-500 text-white", inactive: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" },
    Safe: { active: "bg-emerald-500 text-white", inactive: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" },
  };

  // Counts per urgency
  const urgencyCounts = useMemo(() => {
    const base = allDocuments.filter((d) => (showArchived ? d.archived : !d.archived));
    return {
      All: base.length,
      Overdue: base.filter((d) => getStatus(getDaysLeft(d.expiry_date)) === "overdue").length,
      Urgent: base.filter((d) => getStatus(getDaysLeft(d.expiry_date)) === "urgent").length,
      Soon: base.filter((d) => getStatus(getDaysLeft(d.expiry_date)) === "soon").length,
      Safe: base.filter((d) => getStatus(getDaysLeft(d.expiry_date)) === "safe").length,
    };
  }, [allDocuments, showArchived]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: allDocuments.filter((d) => !d.archived).length,
    document: documents.filter((d) => !d.archived).length,
    subscription: subscriptions.filter((d) => !d.archived).length,
    voucher: vouchers.filter((d) => !d.archived).length,
  }), [allDocuments, documents, subscriptions, vouchers]);

  return (
    <Layout>
      <div className="min-h-screen pb-28 safe-top animate-route-in" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* Header */}
        <div className="px-5 lg:px-10 pt-12 pb-4">
          <div className="max-w-3xl mx-auto w-full">
            <h1 className="text-foreground text-3xl lg:text-4xl font-display">All Items</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {selectedProfile
                ? `${selectedProfile.name}'s documents`
                : statFilter === "overdue" ? "Overdue items"
                : statFilter === "week" ? "Due this week"
                : statFilter === "month" ? "Due this month"
                : `${filtered.length} item${filtered.length !== 1 ? "s" : ""} ${showArchived ? "archived" : "tracked"}`}
            </p>

            {/* Search bar */}
            <div className="mt-3 flex items-center gap-2 glass-frost rounded-full px-4 py-2.5">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name..."
                className="flex-1 bg-transparent outline-none text-sm text-foreground"
              />
              {query && <button onClick={() => setQuery("")}><X className="w-4 h-4 text-muted-foreground" /></button>}
              <button
                onClick={() => setSelectMode(!selectMode)}
                className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-colors", selectMode ? "accent-gradient text-white" : "text-muted-foreground")}
              >
                <CheckSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Type tab switcher */}
        <div className="px-5 lg:px-10 max-w-3xl mx-auto w-full mb-3">
          <div className="flex items-center gap-1.5 p-1 glass-frost rounded-2xl">
            {DOC_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDocTab(tab.key)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95",
                  docTab === tab.key
                    ? "accent-gradient text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className={cn("ml-1 tabular-nums", docTab === tab.key ? "text-white/80" : "text-muted-foreground/60")}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Customizable filter bar — shows only user-selected filters + All Filters button */}
        <div className="px-5 lg:px-10 max-w-3xl mx-auto w-full mb-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {/* Urgency pills — visible if pref enabled */}
            {filterPrefs.urgency && URGENCY_FILTERS.map((u) => {
              const isActive = urgency === u;
              const colors = urgencyColors[u];
              const count = urgencyCounts[u];
              return (
                <button
                  key={u}
                  onClick={() => { haptic(8); setUrgency(u); }}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95",
                    isActive ? colors.active : colors.inactive
                  )}
                >
                  {u}
                  {count > 0 && <span className="opacity-70 tabular-nums">{count}</span>}
                </button>
              );
            })}

            {filterPrefs.urgency && (filterPrefs.sort || filterPrefs.archived) && <div className="w-px h-4 bg-border shrink-0" />}

            {/* Sort options — visible if pref enabled */}
            {filterPrefs.sort && SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { haptic(8); setSortBy(opt.value); }}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95",
                  sortBy === opt.value
                    ? "bg-foreground text-background"
                    : "bg-foreground/8 text-foreground/70"
                )}
              >
                {opt.label}
              </button>
            ))}

            {/* Tags filter — visible if pref enabled, all tags as scrollable pills */}
            {filterPrefs.tags && allTags.length > 0 && (
              <>
                {filterPrefs.sort && <div className="w-px h-4 bg-border shrink-0" />}
                <button
                  onClick={() => { haptic(8); setSelectedTag(""); }}
                  className={cn(
                    "shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95",
                    !selectedTag ? "accent-gradient text-white" : "bg-foreground/8 text-foreground/70"
                  )}
                >
                  <Tag className="w-3 h-3" />
                  All
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => { haptic(8); setSelectedTag(selectedTag === t ? "" : t); }}
                    className={cn(
                      "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 whitespace-nowrap",
                      selectedTag === t ? "accent-gradient text-white" : "bg-foreground/8 text-foreground/70"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </>
            )}

            {/* Archived toggle — visible if pref enabled */}
            {filterPrefs.archived && (
              <>
                {(filterPrefs.urgency || filterPrefs.sort) && <div className="w-px h-4 bg-border shrink-0" />}
                <button
                  onClick={() => { haptic(8); setShowArchived(!showArchived); }}
                  className={cn(
                    "shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95",
                    showArchived ? "bg-foreground text-background" : "bg-foreground/8 text-foreground/70"
                  )}
                >
                  <Archive className="w-3 h-3" />
                  Archived
                </button>
              </>
            )}

            {selectMode && filtered.length > 0 && (
              <>
                <div className="w-px h-4 bg-border shrink-0" />
                <button onClick={selectAll} className="shrink-0 text-[#FF8C42] dark:text-orange-400 text-xs font-semibold px-2 py-1.5">Select all</button>
              </>
            )}

            {/* All Filters button — always present */}
            <button
              onClick={() => { haptic(10); setAllFiltersOpen(true); }}
              className={cn(
                "shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95",
                "glass-frost text-foreground"
              )}
            >
              <SlidersHorizontal className="w-3 h-3" />
              All Filters
            </button>
          </div>
        </div>

        {/* List */}
        <div className="px-5 lg:px-10 space-y-2.5 max-w-3xl mx-auto w-full">
          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => <div key={i} className="glass-frost rounded-2xl h-20 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={showArchived ? Archive : FileText}
              title={showArchived ? "No archived documents" : query.trim() ? "No results found" : "No items yet"}
              subtitle={showArchived ? "Archived items will appear here." : query.trim() ? "Try adjusting your filters." : "Add your first item to start tracking."}
              action={!showArchived && !query.trim() ? () => navigate("/add") : undefined}
              actionLabel="Add Item"
            />
          ) : (
            filtered.map((doc) => {
              const isSelected = selected.has(doc.id);
              const profile = profiles.find((p) => p.id === doc.profile_id);
              const profileName = profile?.name || doc.profile_name;
              const profileColor = profile?.color || "slate";
              const detail = doc._type === "voucher" && doc.store ? doc.store : doc.category || doc._type;
              return (
                <div key={doc.id} className={cn("glass-frost rounded-2xl p-3.5 flex items-center gap-3 transition-all active:scale-[0.98]", isSelected && "ring-2 ring-[#FF8C42]")}>
                  {selectMode && (
                    <button onClick={() => toggleSelect(doc.id)} className="shrink-0">
                      {isSelected ? <CheckSquare className="w-5 h-5 text-[#FF8C42]" /> : <Square className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  )}
                  <button
                    onClick={() => selectMode ? toggleSelect(doc.id) : navigate(`/document/${doc.id}?type=${doc._type || "document"}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <CustomIcon item={doc} categories={categories} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium text-sm leading-snug line-clamp-2">{doc.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-muted-foreground text-xs font-medium shrink-0">{detail}</span>
                        {profileName && (
                          <>
                            <span className="text-muted-foreground/40 text-xs">·</span>
                            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0", (PROFILE_COLORS[profileColor] || PROFILE_COLORS.slate).tint, (PROFILE_COLORS[profileColor] || PROFILE_COLORS.slate).text)}>
                              {profileName}
                            </span>
                          </>
                        )}
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        <span className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(doc.expiry_date)}</span>
                      </div>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {doc.tags.map((t) => (
                            <span key={t} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-foreground/5 border border-foreground/10 text-muted-foreground">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={cn("text-xs font-semibold shrink-0 whitespace-nowrap", STATUS_CONFIG[getStatus(doc._daysLeft)].accent)}>{formatCountdown(doc._daysLeft)}</span>
                  </button>
                  {!selectMode && (
                    <button onClick={() => { haptic(10); setActionSheet(doc); }} className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center shrink-0 transition-colors">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-full px-3 py-2 flex items-center gap-1 shadow-xl animate-fade-in">
          <BulkButton icon={RefreshCw} label="Renew" onClick={bulkRenew} tint="text-[#FF8C42]" />
          <BulkButton icon={Archive} label="Archive" onClick={bulkArchive} tint="text-muted-foreground" />
          <BulkButton icon={Trash2} label="Delete" onClick={bulkDelete} tint="text-rose-500" />
          <button onClick={clearSelection} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {selectMode && selected.size > 0 && (
        <div className="hidden lg:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-full px-4 py-2.5 items-center gap-2 shadow-xl animate-fade-in">
          <span className="text-foreground text-sm font-medium pr-1">{selected.size} selected</span>
          <div className="w-px h-6 bg-border" />
          <BulkButton icon={RefreshCw} label="Renew All" onClick={bulkRenew} tint="text-[#FF8C42]" />
          <BulkButton icon={Archive} label="Archive" onClick={bulkArchive} tint="text-muted-foreground" />
          <BulkButton icon={Trash2} label="Delete" onClick={bulkDelete} tint="text-rose-500" />
          <button onClick={clearSelection} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSheet && <QuickActionsSheet doc={actionSheet} onClose={() => setActionSheet(null)} />}

      {allFiltersOpen && (
        <AllFiltersSheet
          urgency={urgency} setUrgency={setUrgency}
          sortBy={sortBy} setSortBy={setSortBy}
          showArchived={showArchived} setShowArchived={setShowArchived}
          selectedTag={selectedTag} setSelectedTag={setSelectedTag}
          allTags={allTags}
          urgencyCounts={urgencyCounts}
          onPrefsChange={setFilterPrefs}
          onClose={() => setAllFiltersOpen(false)}
        />
      )}
    </Layout>
  );
}

function BulkButton({ icon: Icon, label, onClick, tint }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/30 dark:hover:bg-white/10 transition-colors">
      <Icon className={cn("w-4 h-4", tint)} />
      <span className="text-foreground text-xs font-medium">{label}</span>
    </button>
  );
}

function QuickActionsSheet({ doc, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const type = doc._type || "document";
  const listKey = type === "document" ? "documents" : type === "subscription" ? "subscriptions" : "vouchers";
  const Entity = db.entities[type === "document" ? "Document" : type === "subscription" ? "Subscription" : "Voucher"];

  const handleArchive = async () => {
    const prev = queryClient.getQueryData([listKey, "all"]);
    queryClient.setQueryData([listKey, "all"], (old) =>
      (old || []).map((d) => (d.id === doc.id ? { ...d, archived: !d.archived } : d))
    );
    onClose();
    try {
      await Entity.update(doc.id, { archived: !doc.archived });
      toast({ title: doc.archived ? "Unarchived" : "Archived", variant: "success" });
    } catch (e) {
      queryClient.setQueryData([listKey, "all"], prev);
      toast({ title: "Failed to archive", variant: "destructive" });
    }
    queryClient.invalidateQueries({ queryKey: [listKey] });
  };

  const handleQuickRenew = async () => {
    const next = computeNextExpiry(doc.expiry_date, doc.recurrence_type);
    if (next) {
      const prev = queryClient.getQueryData([listKey, "all"]);
      queryClient.setQueryData([listKey, "all"], (old) =>
        (old || []).map((d) => (d.id === doc.id ? { ...d, expiry_date: next, snoozed_until: null } : d))
      );
      onClose();
      try {
        console.log("[RenewalHistory] Creating:", { doc: doc.name, prev: doc.expiry_date, next });
        await db.entities.RenewalHistory.create({
          document_id: doc.id, document_name: doc.name,
          renewed_date: new Date().toISOString().split("T")[0],
          previous_expiry: doc.expiry_date, new_expiry: next,
        });
        console.log("[RenewalHistory] ✅ Created for:", doc.name);
        await Entity.update(doc.id, { expiry_date: next, snoozed_until: null });
        toast({ title: "Renewed successfully", variant: "success" });
      } catch (e) {
        queryClient.setQueryData([listKey, "all"], prev);
        toast({ title: "Failed to renew", variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: [listKey] });
    } else {
      navigate(`/document/${doc.id}?type=${type}`);
    }
  };

  const handleSnooze = async (untilDate) => {
    const prev = queryClient.getQueryData([listKey, "all"]);
    queryClient.setQueryData([listKey, "all"], (old) =>
      (old || []).map((d) => (d.id === doc.id ? { ...d, snoozed_until: untilDate } : d))
    );
    setSnoozeOpen(false);
    onClose();
    try {
      await Entity.update(doc.id, { snoozed_until: untilDate });
      toast({ title: "Reminder snoozed", variant: "success" });
    } catch (e) {
      queryClient.setQueryData([listKey, "all"], prev);
      toast({ title: "Failed to snooze", variant: "destructive" });
    }
    queryClient.invalidateQueries({ queryKey: [listKey] });
  };

  const handleDelete = async () => {
    const prev = queryClient.getQueryData([listKey, "all"]);
    queryClient.setQueryData([listKey, "all"], (old) =>
      (old || []).filter((d) => d.id !== doc.id)
    );
    setDeleteOpen(false);
    onClose();
    try {
      await Entity.delete(doc.id);
      toast({ title: `Deleted`, variant: "destructive" });
    } catch (e) {
      queryClient.setQueryData([listKey, "all"], prev);
      toast({ title: "Failed to delete", variant: "destructive" });
    }
    queryClient.invalidateQueries({ queryKey: [listKey] });
  };

  if (snoozeOpen) {
    const presets = [{ label: "Later today", days: 0 }, { label: "Tomorrow", days: 1 }, { label: "3 days", days: 3 }, { label: "7 days", days: 7 }];
    return (
      <div className="fixed inset-0 z-[60] bg-black/40 flex items-end animate-fade-in" onClick={() => setSnoozeOpen(false)}>
        <div className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-3xl mx-auto" onClick={(e) => e.stopPropagation()}>
          <div className="w-10 h-1 bg-foreground/15 rounded-full mx-auto mb-4" />
          <h3 className="text-foreground font-semibold text-base mb-4">Snooze reminder for {doc.name}</h3>
          <div className="space-y-1">
            {presets.map((p) => {
              const d = new Date(); d.setDate(d.getDate() + p.days);
              return (
                <button key={p.label} onClick={() => handleSnooze(d.toISOString().split("T")[0])} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-foreground/5">
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (deleteOpen) {
    return (
      <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-8 animate-fade-in" onClick={() => setDeleteOpen(false)}>
        <div className="glass-frost rounded-3xl p-6 w-full max-w-xs text-center animate-slide-up" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-foreground font-semibold text-base mb-1">Delete item?</h3>
          <p className="text-muted-foreground text-sm mb-5">This action cannot be undone.</p>
          <div className="space-y-2">
            <button onClick={handleDelete} className="w-full bg-rose-500 text-white rounded-full py-3 font-semibold text-sm active:scale-[0.98] transition-transform">Delete</button>
            <button onClick={() => setDeleteOpen(false)} className="w-full text-muted-foreground font-medium text-sm py-2">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  const actions = [
    { icon: RefreshCw, label: "Quick Renew", onClick: handleQuickRenew, tint: "text-[#FF8C42]" },
    { icon: Bell, label: "Snooze", onClick: () => setSnoozeOpen(true), tint: "text-amber-500" },
    { icon: Archive, label: doc.archived ? "Unarchive" : "Archive", onClick: handleArchive, tint: "text-muted-foreground" },
    { icon: Trash2, label: "Delete", onClick: () => setDeleteOpen(true), tint: "text-rose-500" },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end animate-fade-in" onClick={onClose}>
      <div className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-3xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-foreground/15 rounded-full mx-auto mb-4" />
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
          <div className={cn("w-2.5 h-2.5 rounded-full", STATUS_CONFIG[getStatus(getDaysLeft(doc.expiry_date))].dot, ["urgent", "overdue"].includes(getStatus(getDaysLeft(doc.expiry_date))) && "animate-breathe")} />
          <div>
            <p className="text-foreground font-semibold text-sm">{doc.name}</p>
            <p className="text-muted-foreground text-xs">{doc.category}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.label} onClick={a.onClick} className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-foreground/5 transition-colors active:scale-95">
                <Icon className={cn("w-5 h-5", a.tint)} />
                <span className="text-xs font-medium text-foreground text-center leading-tight">{a.label}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => { onClose(); navigate(`/document/${doc.id}?type=${type}`); }} className="w-full text-center text-[#FF8C42] dark:text-orange-400 text-sm font-medium py-3 mt-2">
          View Details
        </button>
      </div>
    </div>
  );
}