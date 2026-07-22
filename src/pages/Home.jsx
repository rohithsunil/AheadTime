import { db } from '@/api/db';

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, CheckCircle2, Sparkles, X, Calendar, BarChart3, Users } from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDaysLeft, getGreeting } from "@/lib/renewalUtils";
import { checkReminders } from "@/lib/reminderChecker";
import { getIconComponent, getColorClass } from "@/lib/categoryUtils";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import EmptyState from "@/components/EmptyState";
import NotificationBanner from "@/components/NotificationBanner";
import StreakBadge from "@/components/StreakBadge";
import StreakSection from "@/components/StreakSection";
import StreakCalendarModal from "@/components/StreakCalendarModal";
import SerenityScoreModal from "@/components/SerenityScoreModal";
import NextRenewalHero from "@/components/NextRenewalHero";
import ItemRow from "@/components/ItemRow";
import BroadcastModal from "@/components/BroadcastModal";
import { preloadImages } from "@/components/CustomIcon";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useStreak } from "@/hooks/useStreak";
import { useCategories } from "@/hooks/useCategories";

export default function Home() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [serenityOpen, setSerenityOpen] = useState(false);
  const queryClient = useQueryClient();
  const { streak, best, canClaim, claimStreak } = useStreak();
  const { data: categories = [] } = useCategories();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", "all"],
    queryFn: () => db.entities.Document.list(),
  });
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["subscriptions", "all"],
    queryFn: () => db.entities.Subscription.list(),
  });
  const { data: vouchers = [] } = useQuery({
    queryKey: ["vouchers", "all"],
    queryFn: () => db.entities.Voucher.list(),
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["documents"] });
    await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
  };

  const { onTouchStart, onTouchEnd } = usePullToRefresh(handleRefresh);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => db.auth.me(),
  });

  // Normalize all three types into a unified shape for stats + upcoming
  const allItems = useMemo(() => {
    const docs = documents.map((d) => ({ ...d, _type: "document" }));
    const subs = subscriptions.map((s) => ({ ...s, _type: "subscription" }));
    const vouch = vouchers.map((v) => ({ ...v, _type: "voucher" }));
    return [...docs, ...subs, ...vouch];
  }, [documents, subscriptions, vouchers]);

  useEffect(() => {
    if (allItems.length > 0) checkReminders(documents);
  }, [allItems, documents]);

  // Preload all custom images for instant display
  useEffect(() => {
    preloadImages(allItems.map((d) => d.custom_image_url));
  }, [allItems]);

  const activeItems = useMemo(() => allItems.filter((d) => !d.archived), [allItems]);

  const stats = useMemo(() => {
    const inRange = (min, max) =>
      activeItems.filter((d) => {
        const dl = getDaysLeft(d.expiry_date);
        return dl !== null && dl >= min && dl <= max;
      }).length;
    const overdue = activeItems.filter((d) => {
      const dl = getDaysLeft(d.expiry_date);
      return dl !== null && dl < 0;
    }).length;
    return {
      total: activeItems.length,
      week: inRange(0, 7),
      month: inRange(0, 30),
      overdue,
    };
  }, [activeItems]);

  const upcoming = useMemo(() => {
    return activeItems
      .map((d) => ({ ...d, _daysLeft: getDaysLeft(d.expiry_date) }))
      .filter((d) => d._daysLeft !== null && d._daysLeft >= 0)
      .sort((a, b) => a._daysLeft - b._daysLeft)
      .slice(0, 5);
  }, [activeItems]);

  // Serenity score: subscriptions only affect score if â‰¤7 days away (not monthly renewal noise)
  const urgentCount = useMemo(() => {
    return activeItems.filter((d) => {
      const dl = getDaysLeft(d.expiry_date);
      if (dl === null) return false;
      if (dl < 0) return true; // overdue always counts
      if (d._type === "subscription") return dl <= 7; // subscriptions: only urgent if â‰¤7 days
      return dl <= 30; // documents/vouchers: urgent if â‰¤30 days
    }).length;
  }, [activeItems]);

  const healthScore =
    activeItems.length === 0 ? 100 : Math.round(((activeItems.length - urgentCount) / activeItems.length) * 100);

  const userName = user?.display_name?.split(" ")[0] || user?.full_name?.split(" ")[0] || user?.email?.split("@")[0].split(/[._]/)[0] || "there";
  const greeting = useMemo(() => getGreeting(), []);

  const handleStatNavigate = (filter) => {
    navigate(`/documents?filter=${filter}`);
  };

  const favCategories = categories.filter((c) => c.favourite);
  const displayCategories = favCategories.length > 0 ? favCategories : categories;

  return (
    <Layout>
      <div className="min-h-screen pb-28 lg:pb-12 safe-top animate-route-in" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* Header */}
        <div className="px-5 lg:px-10 pt-12 lg:pt-14 pb-2">
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-muted-foreground text-sm font-medium">{greeting.text}</p>
                <h1 className="text-foreground text-3xl lg:text-5xl font-display leading-tight mt-0.5">
                  Hey {userName}{" "}
                  <span className={cn("inline-block", !greeting.isNight && "animate-[wave_1.5s_ease-in-out]")}>
                    {greeting.emoji}
                  </span>
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {streak > 0 && <StreakBadge streak={streak} onClick={() => setStreakOpen(true)} />}
                <button
                  onClick={() => setSearchOpen(true)}
                  className="w-10 h-10 rounded-full glass-panel flex items-center justify-center active:scale-95 transition-transform shrink-0"
                >
                  <Search className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </div>
            {streak > 0 && (
              <p className="text-muted-foreground text-xs mt-0.5">
                {streak >= 7 ? "ðŸ”¥ You're on fire!" : "Keep opening daily to build your streak"}
              </p>
            )}
          </div>
        </div>

        <div className="px-5 lg:px-10 max-w-3xl mx-auto w-full space-y-5">
          <NotificationBanner />

          {/* Serenity Score â€” tap to see what affects it */}
          <div className="flex flex-col items-center py-4">
            <button onClick={() => setSerenityOpen(true)} className="relative w-44 h-44 flex items-center justify-center active:scale-95 transition-transform">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 176 176">
                <circle cx="88" cy="88" r="76" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="6" className="dark:stroke-white/5" />
                <circle
                  cx="88" cy="88" r="76" fill="none" stroke="url(#healthGrad)" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${(healthScore / 100) * 477} 477`}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FF8C42" />
                    <stop offset="100%" stopColor="#F0708E" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex flex-col items-center">
                <Sparkles className="w-6 h-6 text-[#FF8C42] mb-1" />
                <span className="text-foreground text-5xl font-display leading-none tabular-nums">{healthScore}</span>
                <span className="text-muted-foreground text-xs mt-1">Serenity Score</span>
              </div>
            </button>
            <button
              onClick={() => urgentCount > 0 && setSerenityOpen(true)}
              className={cn("text-center text-sm mt-3 max-w-[220px]", urgentCount > 0 ? "text-[#FF8C42] dark:text-orange-400 font-medium active:scale-95 transition-transform" : "text-muted-foreground")}
            >
              {urgentCount === 0
                ? "Everything is on track â€” you're all set."
                : `${urgentCount} item${urgentCount !== 1 ? "s" : ""} need${urgentCount === 1 ? "s" : ""} attention`}
            </button>
            {/* Inline mini-stats */}
            <div className="flex items-center gap-6 mt-4">
              <div className="flex flex-col items-center">
                <span className="text-foreground text-2xl font-display leading-none tabular-nums">{stats.total}</span>
                <span className="text-muted-foreground text-[10px] mt-0.5">Tracking</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <button onClick={() => handleStatNavigate("week")} className="flex flex-col items-center active:scale-95 transition-transform">
                <span className="text-foreground text-2xl font-display leading-none tabular-nums">{stats.week}</span>
                <span className="text-muted-foreground text-[10px] mt-0.5">This week</span>
              </button>
              <div className="w-px h-8 bg-border" />
              <button onClick={() => handleStatNavigate("overdue")} className="flex flex-col items-center active:scale-95 transition-transform">
                <span className={cn("text-2xl font-display leading-none tabular-nums", stats.overdue > 0 ? "text-rose-500 dark:text-rose-400" : "text-foreground")}>{stats.overdue}</span>
                <span className="text-muted-foreground text-[10px] mt-0.5">Overdue</span>
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-2.5">
            <QuickLink icon={Calendar} label="Calendar" onClick={() => navigate("/calendar")} tint="text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50" />
            <QuickLink icon={BarChart3} label="Insights" onClick={() => navigate("/insights")} tint="text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50" />
            <QuickLink icon={Users} label="Profiles" onClick={() => navigate("/profiles")} tint="text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/50" />
          </div>

          {/* Upcoming */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-foreground text-base font-medium">Upcoming Renewals</h2>
              <button onClick={() => navigate("/documents")} className="text-[#FF8C42] dark:text-orange-400 text-sm font-medium">
                See all
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-frost rounded-2xl h-16 animate-pulse" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All clear!"
                subtitle="No upcoming renewals to track yet."
                action={() => navigate("/add")}
                actionLabel="Add Item"
              />
            ) : (
              <div className="space-y-2.5">
                <NextRenewalHero
                  item={upcoming[0]}
                  categories={categories}
                  onClick={() => navigate(`/document/${upcoming[0].id}?type=${upcoming[0]._type}`)}
                />
                {upcoming.slice(1).map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    categories={categories}
                    onClick={() => navigate(`/document/${item.id}?type=${item._type}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Streaks â€” prominent section, tap to open full calendar */}
          <div onClick={() => streak > 0 && setStreakOpen(true)} className={streak > 0 ? "cursor-pointer" : ""}>
            <StreakSection streak={streak} best={best} canClaim={canClaim} onClaim={claimStreak} />
          </div>

          {/* Categories */}
          {displayCategories.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-foreground text-base font-medium">Categories</h2>
                <button onClick={() => navigate("/categories")} className="text-[#FF8C42] dark:text-orange-400 text-sm font-medium">
                  Manage
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 lg:-mx-10 px-5 lg:px-10 pb-1">
                {displayCategories.map((cat) => {
                  const Icon = getIconComponent(cat.icon);
                  const count = activeItems.filter((d) => d.category === cat.name).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => navigate(`/documents?category=${encodeURIComponent(cat.name)}`)}
                      className="shrink-0 glass-frost rounded-2xl px-4 py-3 flex flex-col items-center gap-1.5 min-w-[80px] active:scale-95 transition-transform"
                    >
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", getColorClass(cat.color))}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-foreground text-xs font-medium">{cat.name}</span>
                      <span className="text-muted-foreground text-[10px]">{count} items</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} items={allItems} />}
      {streakOpen && <StreakCalendarModal streak={streak} best={best} onClose={() => setStreakOpen(false)} />}
      {serenityOpen && <SerenityScoreModal score={healthScore} items={activeItems} categories={categories} onClose={() => setSerenityOpen(false)} />}
      <BroadcastModal />
    </Layout>
  );
}

function QuickLink({ icon: Icon, label, onClick, tint }) {
  return (
    <button
      onClick={onClick}
      className="glass-frost rounded-2xl py-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", tint)}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-foreground text-xs font-medium">{label}</span>
    </button>
  );
}

function SearchOverlay({ onClose, items }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return items
      .filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
  }, [query, items]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-start animate-fade-in" onClick={onClose}>
      <div className="w-full glass-frost rounded-b-3xl p-5 pt-4 animate-slide-up max-w-3xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 glass-frost rounded-full px-4 py-2.5">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all items..."
              className="flex-1 bg-transparent outline-none text-sm text-foreground"
            />
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full glass-frost flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No results found</p>
          )}
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => { onClose(); navigate(`/document/${item.id}?type=${item._type}`); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-foreground/5 text-left"
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{item._type}{item.store ? ` • ${item.store}` : ""}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}