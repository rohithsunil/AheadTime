import { db } from '@/api/db';

import React, { useMemo, useState } from "react";
import { TrendingDown, Wallet, FileText, Sparkles, BarChart3, Receipt, CalendarDays, Repeat, Pencil } from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { getDaysLeft, getStatus } from "@/lib/renewalUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { getIconComponent, getColorClass } from "@/lib/categoryUtils";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import EmptyState from "@/components/EmptyState";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid,
} from "recharts";

const REFLECTIONS = [
  "A little planning today keeps the rush away tomorrow.",
  "Calm isn't the absence of tasks — it's knowing when they're due.",
  "What you track, you master.",
  "Small habits, kept daily, become a life kept well.",
  "The best time to renew was yesterday. The next best is now.",
  "Clarity is kindness to your future self.",
  "Don't count the days — make the days count, then mark them done.",
  "Preparation is the quietest form of confidence.",
];

function dailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return REFLECTIONS[day % REFLECTIONS.length];
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass-frost rounded-xl px-3 py-2 shadow-lg">
      <p className="text-foreground text-xs font-medium">{label}</p>
      <p className="text-muted-foreground text-[11px]">{payload[0].value} {payload[0].name}</p>
    </div>
  );
}

export default function Insights() {
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
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["renewalHistory", "all"],
    queryFn: () => db.entities.RenewalHistory.list(),
  });
  const { data: categories = [] } = useCategories();
  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => db.auth.me() });
  const queryClient = useQueryClient();
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState("");

  const handleSaveSalary = async () => {
    try {
      await db.auth.updateMe({ monthly_salary: Number(salaryInput) || 0 });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setEditingSalary(false);
      toast({ title: "Salary updated", variant: "success" });
    } catch (e) {
      toast({ title: "Failed to update salary", variant: "destructive" });
    }
  };

  const allItems = useMemo(() => [
    ...documents.map((d) => ({ ...d, _type: "document" })),
    ...subscriptions.map((s) => ({ ...s, _type: "subscription" })),
    ...vouchers.map((v) => ({ ...v, _type: "voucher" })),
  ], [documents, subscriptions, vouchers]);

  const activeItems = useMemo(() => allItems.filter((d) => !d.archived), [allItems]);

  // Vouchers are not expenses — exclude from all financial calculations
  const expenseItems = useMemo(() => activeItems.filter((d) => d._type !== "voucher"), [activeItems]);

  const subscriptionMonthly = useMemo(() => {
    return expenseItems
      .filter((d) => d._type === "subscription")
      .reduce((sum, item) => {
        const fee = item.renewal_fee || 0;
        if (!fee) return sum;
        switch (item.recurrence_type) {
          case "Monthly": return sum + fee;
          case "Quarterly": return sum + fee / 3;
          case "Semi-annual": return sum + fee / 6;
          case "Annual": return sum + fee / 12;
          case "Biennial": return sum + fee / 24;
          default: return sum;
        }
      }, 0);
  }, [expenseItems]);

  const stats = useMemo(() => {
    const totalFees = expenseItems.reduce((sum, d) => sum + (d.renewal_fee || 0), 0);
    const overdue = activeItems.filter((d) => getDaysLeft(d.expiry_date) < 0).length;

    // Monthly average cost based on recurrence
    const monthlyAvg = expenseItems.reduce((sum, item) => {
      const fee = item.renewal_fee || 0;
      if (!fee) return sum;
      switch (item.recurrence_type) {
        case "Monthly": return sum + fee;
        case "Quarterly": return sum + fee / 3;
        case "Semi-annual": return sum + fee / 6;
        case "Annual": return sum + fee / 12;
        case "Biennial": return sum + fee / 24;
        default: return sum;
      }
    }, 0);

    return { total: activeItems.length, totalFees, overdue, monthlyAvg };
  }, [expenseItems, activeItems]);

  const dueThisMonth = useMemo(() => {
    const now = new Date();
    return expenseItems
      .filter((d) => {
        if (!d.expiry_date) return false;
        const ed = new Date(d.expiry_date + "T00:00:00");
        return ed.getFullYear() === now.getFullYear() && ed.getMonth() === now.getMonth();
      })
      .reduce((sum, d) => sum + (d.renewal_fee || 0), 0);
  }, [expenseItems]);

  const dueNextMonth = useMemo(() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return expenseItems
      .filter((d) => {
        if (!d.expiry_date) return false;
        const ed = new Date(d.expiry_date + "T00:00:00");
        return ed.getFullYear() === next.getFullYear() && ed.getMonth() === next.getMonth();
      })
      .reduce((sum, d) => sum + (d.renewal_fee || 0), 0);
  }, [expenseItems]);

  const statusCounts = useMemo(() => {
    const counts = { safe: 0, soon: 0, urgent: 0, overdue: 0 };
    for (const d of activeItems) {
      const s = getStatus(getDaysLeft(d.expiry_date));
      if (counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }, [activeItems]);

  const categoryCosts = useMemo(() => {
    const map = {};
    for (const item of expenseItems) {
      const cat = item.category || "Other";
      const fee = item.renewal_fee || 0;
      if (!map[cat]) map[cat] = { total: 0, count: 0 };
      map[cat].total += fee;
      map[cat].count += 1;
    }
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [expenseItems]);

  const monthlyRenewals = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en", { month: "short" });
      const count = activeItems.filter((doc) => {
        if (!doc.expiry_date) return false;
        const ed = new Date(doc.expiry_date + "T00:00:00");
        return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
      }).length;
      months.push({ month: label, renewals: count });
    }
    return months;
  }, [activeItems]);

  const historyTimeline = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en", { month: "short" });
      const count = history.filter((h) => {
        if (!h.renewed_date) return false;
        const rd = new Date(h.renewed_date + "T00:00:00");
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
      }).length;
      months.push({ month: label, renewed: count });
    }
    return months;
  }, [history]);

  const docStats = useMemo(() => {
    const docs = activeItems.filter((d) => d._type === "document" || d._type === "warranty");
    const overdue = docs.filter((d) => getDaysLeft(d.expiry_date) < 0).length;
    const upcoming = docs.filter((d) => { const dl = getDaysLeft(d.expiry_date); return dl !== null && dl >= 0 && dl <= 30; }).length;
    return { total: docs.length, overdue, upcoming };
  }, [activeItems]);

  const subStats = useMemo(() => {
    const subs = activeItems.filter((d) => d._type === "subscription");
    return { total: subs.length };
  }, [activeItems]);

  const quote = useMemo(() => dailyQuote(), []);
  const maxCategoryCost = categoryCosts[0]?.total || 1;

  if (isLoading || historyLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-border border-t-[#FF8C42] rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const hasData = activeItems.length > 0 || history.length > 0;

  return (
    <Layout>
      <div className="min-h-screen pb-28 lg:pb-12 safe-top animate-route-in">
        <div className="px-5 lg:px-10 pt-12 pb-2">
          <div className="max-w-3xl mx-auto w-full">
            <h1 className="text-foreground text-3xl lg:text-4xl font-display">Insights</h1>
            <p className="text-muted-foreground text-sm mt-1">A quiet look at how your renewals are doing</p>
          </div>
        </div>

        <div className="px-5 lg:px-10 max-w-3xl mx-auto w-full mt-4 space-y-3">
          {!hasData ? (
            <EmptyState icon={BarChart3} title="No data yet" subtitle="Add items to see insights and analytics." />
          ) : (
            <>
              {/* Monthly Budget — salary vs subscription costs */}
              <div className="glass-frost rounded-3xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Monthly Budget</h3>
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                </div>
                {editingSalary ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={salaryInput}
                      onChange={(e) => setSalaryInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveSalary(); }}
                      className="flex-1 bg-white/60 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-[#FF8C42]"
                      placeholder="Monthly salary"
                      autoFocus
                    />
                    <button onClick={handleSaveSalary} className="accent-gradient text-white rounded-full px-4 py-2 text-xs font-semibold active:scale-95 transition-transform">Save</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-foreground text-2xl font-display">
                        {user?.monthly_salary ? formatCurrency(user.monthly_salary) : "Set salary"}
                      </p>
                      <button onClick={() => { setSalaryInput(user?.monthly_salary || ""); setEditingSalary(true); }} className="w-7 h-7 rounded-full hover:bg-foreground/5 flex items-center justify-center transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    {user?.monthly_salary && subscriptionMonthly > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">Subscriptions</span>
                          <span className="text-foreground text-sm font-semibold">{formatCurrency(subscriptionMonthly)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
                          <div className="h-full rounded-full accent-gradient transition-all duration-500" style={{ width: `${Math.min((subscriptionMonthly / user.monthly_salary) * 100, 100)}%` }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">Remaining</span>
                          <span className="text-emerald-500 dark:text-emerald-400 text-sm font-semibold">{formatCurrency(user.monthly_salary - subscriptionMonthly)}</span>
                        </div>
                        {(subscriptionMonthly / user.monthly_salary) > 0.1 && (
                          <p className="text-amber-600 dark:text-amber-400 text-xs mt-3">
                            Subscriptions use {Math.round((subscriptionMonthly / user.monthly_salary) * 100)}% of your salary — consider reviewing unused ones.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Document vs Subscription breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-frost rounded-3xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    </div>
                    <span className="text-foreground text-sm font-medium">Documents</span>
                  </div>
                  <p className="text-foreground text-2xl font-display">{docStats.total}</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">{docStats.overdue} overdue · {docStats.upcoming} due soon</p>
                </div>
                <div className="glass-frost rounded-3xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
                      <Repeat className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                    </div>
                    <span className="text-foreground text-sm font-medium">Subscriptions</span>
                  </div>
                  <p className="text-foreground text-2xl font-display">{formatCurrency(subscriptionMonthly)}</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">per month · {subStats.total} active</p>
                </div>
              </div>

              {/* Bento grid */}
              <div className="grid grid-cols-6 gap-3">
                {/* Quote — full width */}
                <div className="col-span-6 glass-frost rounded-3xl p-6 flex flex-col justify-between min-h-[120px] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-50/40 via-transparent to-pink-50/30 dark:from-orange-950/10 dark:to-pink-950/10 pointer-events-none" />
                  <Sparkles className="w-5 h-5 text-[#FF8C42] mb-3 relative" />
                  <p className="text-foreground text-lg font-display leading-snug relative">{quote}</p>
                </div>

                {/* Total items */}
                <StatCard
                  className="col-span-3"
                  icon={FileText}
                  iconColor="text-blue-500 dark:text-blue-400"
                  value={stats.total}
                  label="items tracked"
                />

                {/* Overdue */}
                <StatCard
                  className="col-span-3"
                  icon={TrendingDown}
                  iconColor="text-rose-500 dark:text-rose-400"
                  value={stats.overdue}
                  label="overdue"
                  valueClassName={stats.overdue > 0 ? "text-rose-500 dark:text-rose-400" : ""}
                  breathe={stats.overdue > 0}
                />

                {/* Total value + monthly average */}
                <div className="col-span-6 glass-frost rounded-3xl p-5 flex items-center gap-4 hover:bg-white/55 dark:hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10">
                    <Wallet className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-muted-foreground text-[11px]">Total tracked value</p>
                    <p className="text-foreground text-2xl font-display leading-tight">{formatCurrency(stats.totalFees)}</p>
                  </div>
                  {stats.monthlyAvg > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-muted-foreground text-[10px]">avg / month</p>
                      <p className="text-emerald-500 dark:text-emerald-400 text-sm font-semibold tabular-nums">{formatCurrency(stats.monthlyAvg)}</p>
                    </div>
                  )}
                </div>

                {/* Due this month */}
                <StatCard
                  className="col-span-3"
                  icon={Receipt}
                  iconColor="text-[#FF8C42] dark:text-orange-400"
                  value={formatCurrency(dueThisMonth)}
                  label="due this month"
                  valueSize="text-xl"
                />

                {/* Due next month */}
                <StatCard
                  className="col-span-3"
                  icon={CalendarDays}
                  iconColor="text-violet-500 dark:text-violet-400"
                  value={formatCurrency(dueNextMonth)}
                  label="due next month"
                  valueSize="text-xl"
                />
              </div>

              {/* Status breakdown */}
              {activeItems.length > 0 && (
                <div className="glass-frost rounded-3xl p-5">
                  <h3 className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide mb-4">Status Breakdown</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Safe", value: statusCounts.safe, color: "#34D399" },
                      { label: "Soon", value: statusCounts.soon, color: "#FBBF24" },
                      { label: "Urgent", value: statusCounts.urgent, color: "#FB923C" },
                      { label: "Overdue", value: statusCounts.overdue, color: "#FB7185" },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <div className={cn("w-3 h-3 rounded-full mx-auto mb-2", s.label === "Overdue" && s.value > 0 && "animate-breathe")} style={{ background: s.color }} />
                        <p className="text-foreground text-2xl font-display tabular-nums">{s.value}</p>
                        <p className="text-muted-foreground text-[10px]">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost by category */}
              {categoryCosts.length > 0 && (
                <div className="glass-frost rounded-3xl p-5">
                  <h3 className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide mb-4">Cost by Category</h3>
                  <div className="space-y-3">
                    {categoryCosts.map((cat) => {
                      const catMatch = categories.find((c) => c.name === cat.name);
                      const CatIcon = catMatch ? getIconComponent(catMatch.icon) : FileText;
                      const catColor = catMatch ? getColorClass(catMatch.color) : "bg-slate-400";
                      return (
                        <div key={cat.name} className="flex items-center gap-3">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", catColor)}>
                            <CatIcon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-foreground text-xs font-medium truncate">{cat.name}</span>
                              <span className="text-foreground text-xs font-semibold tabular-nums ml-2">{formatCurrency(cat.total)}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/40 dark:bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full accent-gradient transition-all duration-500" style={{ width: `${(cat.total / maxCategoryCost) * 100}%` }} />
                            </div>
                          </div>
                          <span className="text-muted-foreground text-[10px] shrink-0 tabular-nums">{cat.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upcoming renewals chart */}
              {monthlyRenewals.some((m) => m.renewals > 0) && (
                <div className="glass-frost rounded-3xl p-5">
                  <h3 className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide mb-4">Upcoming (6 months)</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={monthlyRenewals}>
                      <defs>
                        <linearGradient id="renewalsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF8C42" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#FF8C42" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF", fontFamily: "Instrument Sans" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="renewals" stroke="#FF8C42" strokeWidth={2} fill="url(#renewalsGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Renewal history chart */}
              {historyTimeline.some((m) => m.renewed > 0) && (
                <div className="glass-frost rounded-3xl p-5">
                  <h3 className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide mb-4">Completed (6 months)</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={historyTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF", fontFamily: "Instrument Sans" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,140,66,0.06)" }} />
                      <Bar dataKey="renewed" fill="#7B68EE" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ className, icon: Icon, iconColor, value, label, valueClassName, valueSize = "text-3xl", breathe }) {
  return (
    <div className={cn("glass-frost rounded-3xl p-4 flex flex-col justify-between hover:bg-white/55 dark:hover:bg-white/5 transition-colors", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10">
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        {breathe && <div className="w-2 h-2 rounded-full bg-rose-500 animate-breathe" />}
      </div>
      <div>
        <p className={cn("font-display leading-none tabular-nums", valueSize, valueClassName || "text-foreground")}>{value}</p>
        <p className="text-muted-foreground text-[11px] mt-1">{label}</p>
      </div>
    </div>
  );
}