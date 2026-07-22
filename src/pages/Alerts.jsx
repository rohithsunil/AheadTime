import { db } from '@/api/db';

import React, { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, Calendar, Bell, ChevronRight, CheckCircle2 } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { getDaysLeft, getStatus, STATUS_CONFIG, formatCountdown, formatDate } from "@/lib/renewalUtils";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import CustomIcon, { preloadImages } from "@/components/CustomIcon";

export default function Alerts() {
  const navigate = useNavigate();

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
  const allItems = useMemo(() => [
    ...documents.map((d) => ({ ...d, _type: "document" })),
    ...subscriptions.map((s) => ({ ...s, _type: "subscription" })),
    ...vouchers.map((v) => ({ ...v, _type: "voucher" })),
  ], [documents, subscriptions, vouchers]);
  const { data: categories = [] } = useCategories();
  const isLoading = docsLoading && subsLoading && vouchLoading;

  const groups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const active = allItems
      .filter((d) => !d.archived)
      .map((d) => ({ ...d, _daysLeft: getDaysLeft(d.expiry_date) }));
    // An item is only "snoozed" if its snooze date is still in the future
    const isSnoozed = (d) => {
      if (!d.snoozed_until) return false;
      const s = new Date(d.snoozed_until);
      s.setHours(0, 0, 0, 0);
      return s > today;
    };
    const awake = active.filter((d) => !isSnoozed(d));
    return {
      overdue: awake.filter((d) => d._daysLeft !== null && d._daysLeft < 0).sort((a, b) => a._daysLeft - b._daysLeft),
      week: awake.filter((d) => d._daysLeft !== null && d._daysLeft >= 0 && d._daysLeft <= 7).sort((a, b) => a._daysLeft - b._daysLeft),
      month: awake.filter((d) => d._daysLeft !== null && d._daysLeft > 7 && d._daysLeft <= 30).sort((a, b) => a._daysLeft - b._daysLeft),
      snoozed: active.filter((d) => isSnoozed(d)),
    };
  }, [allItems]);

  const totalAlerts = groups.overdue.length + groups.week.length + groups.month.length;

  // Preload all custom images for instant display
  useEffect(() => {
    preloadImages(allItems.map((d) => d.custom_image_url));
  }, [allItems]);

  return (
    <Layout>
      <div className="min-h-screen pb-28 safe-top animate-route-in">
        <div className="px-5 lg:px-10 pt-12 pb-2">
          <div className="max-w-3xl mx-auto w-full">
            <h1 className="text-foreground text-3xl lg:text-4xl font-display">Attention Center</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {totalAlerts === 0 ? "Everything looks good!" : `${totalAlerts} item${totalAlerts > 1 ? "s" : ""} need attention`}
            </p>
          </div>
        </div>

        <div className="px-5 lg:px-10 pt-4 space-y-5 max-w-3xl mx-auto w-full">
          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => <div key={i} className="glass-frost rounded-2xl h-16 animate-pulse" />)}
            </div>
          ) : (
            <>
              {totalAlerts === 0 && groups.snoozed.length === 0 && (
                <div className="glass-frost rounded-2xl p-10 flex flex-col items-center text-center mt-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <p className="text-foreground font-medium text-sm">All clear!</p>
                  <p className="text-muted-foreground text-xs mt-1">No pending alerts or overdue items.</p>
                </div>
              )}

              {groups.overdue.length > 0 && <AlertGroup title="Overdue" icon={AlertTriangle} tint="text-rose-500" items={groups.overdue} navigate={navigate} categories={categories} />}
              {groups.week.length > 0 && <AlertGroup title="Due This Week" icon={Clock} tint="text-orange-500" items={groups.week} navigate={navigate} categories={categories} />}
              {groups.month.length > 0 && <AlertGroup title="Due This Month" icon={Calendar} tint="text-amber-500" items={groups.month} navigate={navigate} categories={categories} />}
              {groups.snoozed.length > 0 && <AlertGroup title="Snoozed" icon={Bell} tint="text-slate-400" items={groups.snoozed} navigate={navigate} categories={categories} />}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function AlertGroup({ title, icon: Icon, tint, items, navigate, categories = [] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <Icon className={cn("w-4 h-4", tint)} />
        <h2 className="text-foreground text-sm font-semibold">{title}</h2>
        <span className="text-muted-foreground text-xs">({items.length})</span>
      </div>
      <div className="space-y-2.5">
        {items.map((doc) => {
          const cfg = STATUS_CONFIG[getStatus(doc._daysLeft)];
          const detail = doc._type === "voucher" && doc.store ? doc.store : doc.category || doc._type;
          return (
            <button key={doc.id} onClick={() => navigate(`/document/${doc.id}?type=${doc._type || "document"}`)}
              className="w-full glass-frost rounded-2xl p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
              <CustomIcon item={doc} categories={categories} />
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium text-sm leading-snug line-clamp-2">{doc.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-muted-foreground text-xs truncate">{detail}</span>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(doc.expiry_date)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className={cn("text-xs font-semibold whitespace-nowrap", cfg.accent)}>{formatCountdown(doc._daysLeft)}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}