import { db } from '@/api/db';

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Megaphone, Users, Flame, FileText, Send, Trash2,
  Clock, TrendingUp, Shield, ChevronRight, Mail,
} from "lucide-react";

import Layout from "@/components/Layout";
import PushBroadcastSheet from "@/components/PushBroadcastSheet";
import StreakAdminSheet from "@/components/StreakAdminSheet";
import ChangelogPopup from "@/components/ChangelogPopup";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [streakAdminOpen, setStreakAdminOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => db.auth.me() });

  const { data: broadcasts = [] } = useQuery({
    queryKey: ["pushBroadcasts"],
    queryFn: () => db.entities.PushBroadcast.list("-created_date", 50),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => db.entities.User.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", "all"],
    queryFn: () => db.entities.Document.list(),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["subscriptions", "all"],
    queryFn: () => db.entities.Subscription.list(),
  });

  const { data: streakRecords = [] } = useQuery({
    queryKey: ["allStreakRecords"],
    queryFn: () => db.entities.StreakRecord.list(),
  });

  // Guard: redirect non-admins
  if (user && user.role !== "admin") {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground text-lg font-medium">Admin access required</p>
            <button onClick={() => navigate("/")} className="text-[#FF8C42] mt-2 text-sm font-medium">Go home</button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const adminCount = users.filter((u) => u.role === "admin").length;
  const totalItems = documents.length + subscriptions.length;

  const handleDeleteBroadcast = async (id) => {
    try {
      await db.entities.PushBroadcast.delete(id);
      queryClient.invalidateQueries({ queryKey: ["pushBroadcasts"] });
      toast({ title: "Broadcast deleted", variant: "success" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Layout>
      <div className="min-h-screen safe-top pb-12 animate-route-in">
        {/* Header */}
        <div className="px-5 lg:px-10 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass-frost flex items-center justify-center shrink-0 active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-foreground font-display text-2xl leading-none">Admin Panel</h1>
            <p className="text-muted-foreground text-xs mt-1">Manage broadcasts, users & streaks</p>
          </div>
        </div>

        <div className="px-5 lg:px-10 max-w-4xl mx-auto space-y-6">
          {/* Stats overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Users" value={users.length} tint="text-blue-600 bg-blue-50 dark:bg-blue-950/50" />
            <StatCard icon={FileText} label="Documents" value={totalItems} tint="text-violet-600 bg-violet-50 dark:bg-violet-950/50" />
            <StatCard icon={Megaphone} label="Broadcasts" value={broadcasts.length} tint="text-[#FF8C42] bg-orange-50 dark:bg-orange-950/50" />
            <StatCard icon={Flame} label="Streaks" value={streakRecords.length} tint="text-amber-600 bg-amber-50 dark:bg-amber-950/50" />
          </div>

          {/* Broadcast management */}
          <Section title="Broadcast Management" icon={Megaphone}>
            <button
              onClick={() => setBroadcastOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-foreground/5 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg accent-gradient flex items-center justify-center shrink-0">
                <Send className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Compose New Broadcast</p>
                <p className="text-xs text-muted-foreground">Send to all registered users</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {/* Broadcast history / logs */}
            <div className="px-4 py-3 border-t border-border">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">History ({broadcasts.length})</p>
              {broadcasts.length === 0 ? (
                <p className="text-muted-foreground text-xs py-2">No broadcasts sent yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {broadcasts.map((b) => (
                    <div key={b.id} className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">{b.title}</p>
                        <p className="text-muted-foreground text-xs line-clamp-1">{b.message}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDate(b.created_date)}
                          </span>
                          {b.sent_to_count > 0 && (
                            <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />
                              {b.sent_to_count} users
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBroadcast(b.id)}
                        className="w-7 h-7 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* User management */}
          <Section title="User Management" icon={Users}>
            <div className="px-4 py-3">
              <div className="flex items-center gap-3 mb-3 text-xs">
                <span className="text-muted-foreground">{users.length} total</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{adminCount} admin{adminCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-medium text-foreground shrink-0">
                      {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{u.full_name || u.email}</p>
                      <p className="text-muted-foreground text-xs truncate flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5" />
                        {u.email}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
                      u.role === "admin" ? "accent-gradient text-white" : "bg-foreground/10 text-muted-foreground"
                    )}>
                      {u.role || "user"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Streak management */}
          <Section title="Streak Management" icon={Flame}>
            <button
              onClick={() => setStreakAdminOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-foreground/5 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Adjust User Streaks</p>
                <p className="text-xs text-muted-foreground">Set streak counts for testing</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
            <div className="px-4 py-3 border-t border-border">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">Active Streaks</p>
              {streakRecords.length === 0 ? (
                <p className="text-muted-foreground text-xs py-2">No streak records yet</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {streakRecords.filter(r => r.current_streak > 0).slice(0, 10).map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-1.5">
                      <span className="text-foreground text-sm">User streak</span>
                      <div className="flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-[#FF8C42]" />
                        <span className="text-foreground text-sm font-medium tabular-nums">{r.current_streak} days</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Changelog management */}
          <Section title="Changelog Management" icon={FileText}>
            <button
              onClick={() => setChangelogOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-foreground/5 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Manage Changelog</p>
                <p className="text-xs text-muted-foreground">Add or remove version entries</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </Section>

          <p className="text-center text-muted-foreground text-xs pt-2">Admin Panel — AheadTime v3.0</p>
        </div>
      </div>

      {broadcastOpen && <PushBroadcastSheet onClose={() => setBroadcastOpen(false)} />}
      {streakAdminOpen && <StreakAdminSheet onClose={() => setStreakAdminOpen(false)} />}
      {changelogOpen && <ChangelogPopup onClose={() => setChangelogOpen(false)} isAdmin={true} />}
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="glass-frost rounded-2xl p-4 flex flex-col items-start">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-2", tint)}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-foreground text-2xl font-display tabular-nums leading-none">{value}</span>
      <span className="text-muted-foreground text-xs mt-1">{label}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2 px-1 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </h2>
      <div className="glass-frost rounded-2xl overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}