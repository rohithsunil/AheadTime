import { db } from '@/api/db';

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, Monitor, Lock, Download, ChevronRight, Bell, Tag, HelpCircle, LogOut, X, Delete, Users, Trash2, AlertTriangle, Wallet, ChevronDown, Upload, UserCircle, Check, Contrast, Sparkles, RefreshCw, Flame, Megaphone, RotateCcw, Shield } from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { requestNotificationPermission, getNotificationSetting, setNotificationSetting, getNotificationPermission, openNotificationSettings } from "@/lib/reminderChecker";
import { CURRENCIES, getCurrency, setCurrency } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import Layout from "@/components/Layout";
import ChangelogPopup from "@/components/ChangelogPopup";
import StreakAdminSheet from "@/components/StreakAdminSheet";
import PushBroadcastSheet from "@/components/PushBroadcastSheet";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(() => getNotificationSetting());
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [currency, setActiveCurrency] = useState(() => getCurrency().code);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [streakAdminOpen, setStreakAdminOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [hardReloading, setHardReloading] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => db.auth.me() });
  const { data: changelog = [] } = useQuery({ queryKey: ["changelog"], queryFn: () => db.entities.ChangelogEntry.list("-date", 1) });
  const isAdmin = user?.role === "admin";
  const latestVersion = changelog[0]?.version;

  const toggleNotifications = async (enabled) => {
    if (enabled) {
      const permission = getNotificationPermission();

      // If the API doesn't exist at all (rare), show unsupported message
      if (permission === "unsupported") {
        setNotifications(false);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        toast({
          title: "Notifications need setup",
          description: isAndroid
            ? "Install AheadTime to your home screen from Chrome ⋮ → Add to Home Screen, then open it from there to enable notifications."
            : isIOS
            ? "Add to Home Screen → open from the icon → enable in iOS Settings."
            : "Use Chrome or install the app to enable notifications.",
          variant: "default",
          duration: 8000,
        });
        return;
      }

      if (permission === "denied") {
        // Can't re-prompt — show step-by-step instructions for the platform
        setNotifications(false);
        const instructions = openNotificationSettings();
        toast({
          title: "Notifications blocked",
          description: instructions || "Open settings to allow notifications for this app.",
          variant: "default",
          duration: 6000,
        });
        return;
      }

      // Permission is "default" — request it (must be within the click gesture)
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationSetting(true);
        setNotifications(true);
        toast({ title: "Notifications enabled", variant: "success" });
      } else {
        // Permission not granted — keep toggle off, guide to settings
        setNotifications(false);
        const currentPerm = getNotificationPermission();
        const instructions = openNotificationSettings();
        toast({
          title: currentPerm === "denied" ? "Notifications blocked" : "Permission needed",
          description: instructions || "Allow notifications in your browser or app settings.",
          variant: "default",
          duration: 6000,
        });
      }
    } else {
      setNotificationSetting(false);
      setNotifications(false);
      toast({ title: "Notifications disabled", variant: "default" });
    }
  };

  const handleExport = async () => {
    try {
      const [docs, subs, vouchers, warranties, categories, profiles, history] = await Promise.all([
        db.entities.Document.list(),
        db.entities.Subscription.list(),
        db.entities.Voucher.list(),
        db.entities.Warranty.list(),
        db.entities.Category.list(),
        db.entities.FamilyProfile.list(),
        db.entities.RenewalHistory.list(),
      ]);
      const backup = {
        app: "AheadTime",
        version: "3.0",
        exported_at: new Date().toISOString(),
        documents: docs.map(({ id, created_date, updated_date, created_by_id, ...rest }) => rest),
        subscriptions: subs.map(({ id, created_date, updated_date, created_by_id, ...rest }) => rest),
        vouchers: vouchers.map(({ id, created_date, updated_date, created_by_id, ...rest }) => rest),
        warranties: warranties.map(({ id, created_date, updated_date, created_by_id, ...rest }) => rest),
        categories: categories.map(({ id, created_date, updated_date, created_by_id, ...rest }) => rest),
        family_profiles: profiles.map(({ id, created_date, updated_date, created_by_id, ...rest }) => rest),
        renewal_history: history.map(({ id, created_date, updated_date, created_by_id, ...rest }) => rest),
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aheadtime-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const total = docs.length + subs.length + vouchers.length + categories.length + profiles.length;
      toast({ title: "Backup ready", description: `${total} items exported`, variant: "success" });
    } catch (e) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleLogout = async () => { await db.auth.logout(); };

  const testNotification = async () => {
    let permission = typeof Notification !== "undefined" ? Notification.permission : "denied";
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission === "granted") {
      try {
        new Notification("AheadTime Test", {
          body: "Notifications are working! You'll get alerts before your renewals expire.",
          tag: "aheadtime-test",
        });
        toast({ title: "Test sent", description: "Check your device for the notification.", variant: "success" });
      } catch {
        toast({ title: "Notification failed", description: "Your browser blocked the notification.", variant: "destructive" });
      }
    } else {
      toast({ title: "Permission needed", description: "Enable notifications in your browser/app settings to test.", variant: "default" });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await queryClient.invalidateQueries();
      toast({ title: "Sync complete", description: "All data refreshed from server", variant: "success" });
    } catch (e) {
      toast({ title: "Sync failed", variant: "destructive" });
    }
    setSyncing(false);
  };

  // Hard reload: clears ALL caches, service workers, React Query cache, and
  // app-specific localStorage data — then forces a fresh reload from the server.
  // Fixes PWA stale-cache issues where old versions/features persist across devices.
  const handleHardReload = async () => {
    setHardReloading(true);
    try {
      // 1. Clear all Cache API caches (old PWA assets)
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((k) => caches.delete(k)));
      }

      // 2. Unregister all service workers (forces re-fetch of new version)
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }

      // 3. Clear React Query cache (stale data)
      queryClient.clear();

      // 4. Clear app-specific localStorage (keep auth token so user stays logged in)
      const keysToKeep = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith("aheadtime-")) keysToKeep.push(key);
      }
      const savedValues = {};
      keysToKeep.forEach((k) => { savedValues[k] = localStorage.getItem(k); });
      localStorage.clear();
      Object.entries(savedValues).forEach(([k, v]) => { if (v !== null) localStorage.setItem(k, v); });

      // 5. Clear sessionStorage
      sessionStorage.clear();

      // 6. Hard reload — bypass cache
      window.location.reload();
    } catch (e) {
      // Fallback: just reload
      window.location.reload();
    }
  };

  return (
    <Layout>
      <div className="min-h-screen pb-28 safe-top animate-route-in">
        <div className="px-5 lg:px-10 pt-12 pb-2">
          <div className="max-w-3xl mx-auto w-full">
            <h1 className="text-foreground text-3xl lg:text-4xl font-display">Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">Privacy, security & preferences</p>
          </div>
        </div>

        <div className="px-5 lg:px-10 pt-4 space-y-5 max-w-3xl mx-auto w-full">
          <Section title="Appearance">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3">
              <ThemeButton icon={Sun} label="Light" active={theme === "light"} onClick={() => setTheme("light")} />
              <ThemeButton icon={Moon} label="Dark" active={theme === "dark"} onClick={() => setTheme("dark")} />
              <ThemeButton icon={Contrast} label="AMOLED" active={theme === "amoled"} onClick={() => setTheme("amoled")} />
              <ThemeButton icon={Monitor} label="Auto" active={theme === "system"} onClick={() => setTheme("system")} />
            </div>
          </Section>

          <Section title="Reminders">
            <ToggleRow icon={Bell} label="Notifications" description="Get alerts before deadlines" value={notifications} onChange={toggleNotifications} />
            <InfoRow icon={Bell} label="Default Reminder Schedule" value="30 / 7 / 0 days before expiry" />
          </Section>

          <Section title="Regional">
            <button
              onClick={() => setCurrencyOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-foreground/5 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Currency</p>
                <p className="text-xs text-muted-foreground">{CURRENCIES.find(c => c.code === currency)?.label || currency}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </Section>

          <Section title="Account">
            <RowButton icon={UserCircle} label="Edit Profile" subtitle="Change your name and details" tint="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" onClick={() => setEditProfileOpen(true)} />
          </Section>

          {isAdmin && (
            <Section title="Admin">
              <RowButton icon={Shield} label="Admin Panel" subtitle="Manage broadcasts, users & streaks" tint="text-[#FF8C42] dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50" onClick={() => navigate("/admin")} />
              <RowButton icon={Megaphone} label="Send Broadcast" subtitle="Push a notification to all users" tint="text-[#FF8C42] dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50" onClick={() => setBroadcastOpen(true)} />
              <RowButton icon={Flame} label="Streak Testing" subtitle="Adjust streak counts for users" tint="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50" onClick={() => setStreakAdminOpen(true)} />
            </Section>
          )}

          <Section title="Data & Backup">
            <RowButton icon={RefreshCw} label={syncing ? "Syncing…" : "Sync Now"} subtitle="Force refresh all data from server" tint="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" onClick={handleSync} />
            <RowButton icon={RotateCcw} label={hardReloading ? "Clearing cache…" : "Hard Reload"} subtitle="Clear all cache & offline data, pull fresh version" tint="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50" onClick={handleHardReload} />
            <RowButton icon={Download} label="Export Backup" subtitle="Download all data as JSON backup" tint="text-[#FF8C42] bg-orange-50 dark:bg-orange-950/50" onClick={handleExport} />
            <RowButton icon={Upload} label="Import Backup" subtitle="Restore data from a JSON backup" tint="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50" onClick={() => setImportOpen(true)} />
            <RowButton icon={Users} label="Family Profiles" subtitle="Manage profiles and organize documents" tint="text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/50" onClick={() => navigate("/profiles")} />
            <RowButton icon={Tag} label="Manage Categories" subtitle="View categories and item counts" tint="text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50" onClick={() => navigate("/categories")} />
          </Section>

          <Section title="About">
            <RowButton icon={Sparkles} label="What's New" subtitle={latestVersion ? `Latest: v${latestVersion}` : "View changelog"} tint="text-[#FF8C42] dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50" onClick={() => setChangelogOpen(true)} />
            <RowButton icon={Bell} label="Test Notifications" subtitle="Send a test notification to verify alerts work" tint="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" onClick={testNotification} />
            <RowButton icon={HelpCircle} label="Help & Onboarding" subtitle="Replay the intro guide" tint="text-muted-foreground bg-foreground/5" onClick={() => navigate("/onboarding")} />
          </Section>

          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 glass-frost rounded-2xl py-3.5 text-rose-500 dark:text-rose-400 font-medium text-sm active:scale-[0.98] transition-transform select-none">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>

          <button onClick={() => setDeleteAccountOpen(true)} className="w-full flex items-center justify-center gap-2 glass-frost rounded-2xl py-3.5 text-rose-700 dark:text-rose-500 font-medium text-sm active:scale-[0.98] transition-transform select-none border border-rose-200 dark:border-rose-900/50">
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>

          <p className="text-center text-muted-foreground text-xs">AheadTime v{latestVersion || "3.0"} — made with ❤️ by 8px Studio</p>
        </div>
      </div>

      {deleteAccountOpen && (
        <DeleteAccountDialog onClose={() => setDeleteAccountOpen(false)} />
      )}

      {editProfileOpen && <EditProfileDialog onClose={() => setEditProfileOpen(false)} />}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
      {changelogOpen && <ChangelogPopup onClose={() => setChangelogOpen(false)} isAdmin={isAdmin} />}
      {streakAdminOpen && <StreakAdminSheet onClose={() => setStreakAdminOpen(false)} />}
      {broadcastOpen && <PushBroadcastSheet onClose={() => setBroadcastOpen(false)} />}

      {currencyOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end animate-fade-in" onClick={() => setCurrencyOpen(false)}>
          <div className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-3xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-foreground/15 rounded-full mx-auto mb-4" />
            <h3 className="text-foreground font-semibold text-base mb-3">Select Currency</h3>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => { setCurrency(c.code); setActiveCurrency(c.code); setCurrencyOpen(false); toast({ title: "Currency updated", description: c.label, variant: "success" }); }}
                  className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    currency === c.code ? "accent-gradient text-white" : "text-foreground hover:bg-foreground/5"
                  )}
                >
                  <span className="w-10 text-base font-bold">{c.symbol}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2 px-1">{title}</h2>
      <div className="glass-frost rounded-2xl overflow-hidden divide-y divide-border">{children}</div>
    </div>
  );
}

function ThemeButton({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors", active ? "accent-gradient text-white" : "glass-frost text-muted-foreground")}>
      <Icon className="w-5 h-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function ToggleRow({ icon: Icon, label, description, value, onChange, disabled }) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3.5", disabled && "opacity-40")}>
      <div className="w-9 h-9 rounded-lg bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button onClick={() => !disabled && onChange(!value)} className={cn("w-11 h-6 rounded-full transition-colors relative shrink-0", value ? "accent-gradient" : "bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10")}>
        <div className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform", value ? "translate-x-5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-9 h-9 rounded-lg bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

function RowButton({ icon: Icon, label, subtitle, tint, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-foreground/5 transition-colors text-left">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", tint)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function DeleteAccountDialog({ onClose }) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirm !== "DELETE") { setError('Type DELETE to confirm'); return; }
    setLoading(true);
    try {
      const docs = await db.entities.Document.list();
      for (const d of docs) await db.entities.Document.delete(d.id);
      await db.auth.logout();
      navigate("/login");
    } catch (e) {
      setError("Failed to delete account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center px-6 animate-fade-in" onClick={onClose}>
      <div className="glass-frost rounded-3xl p-6 w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <h3 className="text-foreground font-semibold text-base">Delete Account</h3>
        </div>
        <p className="text-muted-foreground text-sm mb-4">This permanently deletes your account and all tracked documents. This cannot be undone.</p>
        <p className="text-foreground text-xs font-medium mb-2">Type <span className="font-bold text-rose-600 dark:text-rose-400">DELETE</span> to confirm</p>
        <input
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(""); }}
          placeholder="DELETE"
          className="w-full bg-white/60 dark:bg-white/10 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none mb-3"
        />
        {error && <p className="text-rose-500 text-xs mb-3">{error}</p>}
        <div className="space-y-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="w-full bg-rose-600 text-white rounded-full py-3 font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete My Account"}
          </button>
          <button onClick={onClose} className="w-full text-muted-foreground font-medium text-sm py-2">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function EditProfileDialog({ onClose }) {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => db.auth.me() });
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => { if (user?.display_name || user?.full_name) setName(user.display_name || user.full_name); }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // full_name is a read-only built-in; display_name is our editable custom field
      const updatedUser = await db.auth.updateMe({ display_name: name.trim() });
      queryClient.setQueryData(["currentUser"], (old) => ({
        ...(old || {}),
        ...(updatedUser || {}),
        display_name: name.trim(),
      }));
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setSaving(false);
      setSaved(true);
      toast({ title: "Profile updated", variant: "success" });
      setTimeout(onClose, 600);
    } catch (e) {
      setSaving(false);
      toast({ title: "Failed to update profile", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-6 animate-fade-in" onClick={onClose}>
      <div className="glass-frost rounded-3xl p-6 w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <UserCircle className="w-5 h-5 text-blue-500" />
          <h3 className="text-foreground font-semibold text-base">Edit Profile</h3>
        </div>
        <div className="mb-2">
          <p className="text-xs text-muted-foreground mb-1">Email</p>
          <p className="text-sm text-foreground bg-white/30 dark:bg-white/10 rounded-xl px-4 py-2.5">{user?.email || "—"}</p>
        </div>
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">Display Name</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full bg-white/60 dark:bg-white/10 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF8C42] transition-colors"
          />
        </div>
        <div className="space-y-2">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full accent-gradient text-white rounded-full py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={onClose} className="w-full text-muted-foreground font-medium text-sm py-2">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ImportDialog({ onClose }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");
  const fileRef = React.useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    setMessage("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const backup = Array.isArray(parsed) ? { documents: parsed } : parsed;

      let totalImported = 0;
      const counts = {};

      // Import categories — merge by name (skip duplicates to avoid dups)
      const sanitize = (record) => {
        if (!record || typeof record !== "object") return null;
        const { id, created_date, updated_date, created_by_id, is_sample, profile_id, ...clean } = record;
        const isUuid = typeof profile_id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile_id);
        if (isUuid) clean.profile_id = profile_id;
        return clean;
      };

      if (Array.isArray(backup.categories) && backup.categories.length > 0) {
        const existingCats = await db.entities.Category.list();
        const existingNames = new Set(existingCats.map((c) => (c.name || "").toLowerCase()));
        const newCats = backup.categories.map(sanitize).filter((c) => c && !existingNames.has((c.name || "").toLowerCase()));
        if (newCats.length > 0) {
          await db.entities.Category.bulkCreate(newCats);
          counts.categories = newCats.length;
          totalImported += newCats.length;
        }
      }

      // Import family profiles — merge by name (skip duplicates)
      if (Array.isArray(backup.family_profiles) && backup.family_profiles.length > 0) {
        const existingProfiles = await db.entities.FamilyProfile.list();
        const existingNames = new Set(existingProfiles.map((p) => (p.name || "").toLowerCase()));
        const newProfiles = backup.family_profiles.map(sanitize).filter((p) => p && !existingNames.has((p.name || "").toLowerCase()));
        if (newProfiles.length > 0) {
          await db.entities.FamilyProfile.bulkCreate(newProfiles);
          counts.profiles = newProfiles.length;
          totalImported += newProfiles.length;
        }
      }

      // Import documents
      if (Array.isArray(backup.documents) && backup.documents.length > 0) {
        const cleanDocs = backup.documents.map(sanitize).filter(Boolean);
        if (cleanDocs.length > 0) {
          await db.entities.Document.bulkCreate(cleanDocs);
          counts.documents = cleanDocs.length;
          totalImported += cleanDocs.length;
        }
      }

      // Import subscriptions
      if (Array.isArray(backup.subscriptions) && backup.subscriptions.length > 0) {
        const cleanSubs = backup.subscriptions.map(sanitize).filter(Boolean);
        if (cleanSubs.length > 0) {
          await db.entities.Subscription.bulkCreate(cleanSubs);
          counts.subscriptions = cleanSubs.length;
          totalImported += cleanSubs.length;
        }
      }

      // Import vouchers
      if (Array.isArray(backup.vouchers) && backup.vouchers.length > 0) {
        const cleanVouchers = backup.vouchers.map(sanitize).filter(Boolean);
        if (cleanVouchers.length > 0) {
          await db.entities.Voucher.bulkCreate(cleanVouchers);
          counts.vouchers = cleanVouchers.length;
          totalImported += cleanVouchers.length;
        }
      }

      // Import warranties
      if (Array.isArray(backup.warranties) && backup.warranties.length > 0) {
        const cleanWarranties = backup.warranties.map(sanitize).filter(Boolean);
        if (cleanWarranties.length > 0) {
          await db.entities.Warranty.bulkCreate(cleanWarranties);
          counts.warranties = cleanWarranties.length;
          totalImported += cleanWarranties.length;
        }
      }

      // Import renewal history
      if (Array.isArray(backup.renewal_history) && backup.renewal_history.length > 0) {
        const cleanHistory = backup.renewal_history.map(sanitize).filter(Boolean);
        if (cleanHistory.length > 0) {
          await db.entities.RenewalHistory.bulkCreate(cleanHistory);
          counts.history = cleanHistory.length;
          totalImported += cleanHistory.length;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });

      if (totalImported === 0) {
        setStatus("error");
        setMessage("No valid records found in the backup file.");
        return;
      }

      const parts = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ");
      setStatus("success");
      setMessage(`${totalImported} items imported (${parts}).`);
    } catch (err) {
      console.error("Backup import error:", err);
      setStatus("error");
      setMessage(err?.message || "Failed to parse file. Make sure it's a valid AheadTime JSON backup.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-6 animate-fade-in" onClick={status !== "loading" ? onClose : undefined}>
      <div className="glass-frost rounded-3xl p-6 w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-5 h-5 text-green-500" />
          <h3 className="text-foreground font-semibold text-base">Import Backup</h3>
        </div>
        <p className="text-muted-foreground text-sm mb-4">Restore all data from an AheadTime JSON backup. This adds to your current data without overwriting.</p>

        {status === "idle" && (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-2xl py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-[#FF8C42] hover:text-[#FF8C42] transition-colors"
          >
            <Upload className="w-6 h-6" />
            <span className="text-sm font-medium">Tap to choose file</span>
            <span className="text-xs">JSON backup</span>
          </button>
        )}
        {status === "loading" && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-8 h-8 border-4 border-border border-t-green-500 rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Restoring…</p>
          </div>
        )}
        {(status === "success" || status === "error") && (
          <div className={`rounded-2xl p-4 text-sm text-center mb-4 ${status === "success" ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300" : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300"}`}>
            {message}
          </div>
        )}

        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
        <button onClick={onClose} className="w-full text-muted-foreground font-medium text-sm py-2 mt-2">
          {status === "success" ? "Done" : "Cancel"}
        </button>
      </div>
    </div>
  );
}

function PinSetupSheet({ onClose, onComplete }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState("enter");
  const [error, setError] = useState("");

  const handleDigit = (d) => {
    if (step === "enter") {
      const newPin = pin + d; setPin(newPin);
      if (newPin.length === 4) setStep("confirm");
    } else {
      const newConfirm = confirm + d; setConfirm(newConfirm);
      if (newConfirm.length === 4) {
        if (newConfirm === pin) onComplete(pin);
        else {
          setError("PINs don't match. Try again.");
          setTimeout(() => { setPin(""); setConfirm(""); setStep("enter"); setError(""); }, 1000);
        }
      }
    }
  };

  const currentPin = step === "enter" ? pin : confirm;

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-6 animate-fade-in" onClick={onClose}>
      <div className="glass-frost rounded-3xl p-6 w-full max-w-xs animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#FF8C42]" />
            <h3 className="text-foreground font-display text-xl">Set PIN</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-center text-muted-foreground text-sm mb-6">{step === "enter" ? "Enter a 4-digit PIN" : "Confirm your PIN"}</p>
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn("w-3.5 h-3.5 rounded-full transition-colors", currentPin.length > i ? "accent-gradient" : "bg-border")} />
          ))}
        </div>
        {error && <p className="text-center text-rose-500 text-sm mb-4 animate-fade-in">{error}</p>}
        <div className="grid grid-cols-3 gap-2.5">
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <button key={n} onClick={() => handleDigit(String(n))} className="aspect-square rounded-2xl bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 text-foreground text-lg font-medium active:scale-95 transition-transform flex items-center justify-center">{n}</button>
          ))}
          <div />
          <button onClick={() => handleDigit("0")} className="aspect-square rounded-2xl bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 text-foreground text-lg font-medium active:scale-95 transition-transform flex items-center justify-center">0</button>
          <button onClick={() => { if (step === "enter") setPin(pin.slice(0, -1)); else setConfirm(confirm.slice(0, -1)); }} className="aspect-square flex items-center justify-center text-muted-foreground active:scale-95 transition-transform">
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}