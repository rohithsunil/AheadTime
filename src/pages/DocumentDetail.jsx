import { db } from '@/api/db';

import React, { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Calendar, Paperclip, RefreshCw, Pencil, Bell, Trash2, Clock, ChevronRight, Archive, Tag, FileText, History, BellRing, Ticket, CheckCircle2, ExternalLink, Zap } from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDaysLeft, getStatus, STATUS_CONFIG, formatDate, computeNextExpiry } from "@/lib/renewalUtils";
import { PROFILE_COLORS } from "@/lib/templates";
import { formatCurrency } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import Layout from "@/components/Layout";
import ImageViewer from "@/components/ImageViewer";

const ENTITY_MAP = {
  document: { entity: "Document", listKey: "documents", singleKey: (id) => ["document", id] },
  subscription: { entity: "Subscription", listKey: "subscriptions", singleKey: (id) => ["subscription", id] },
  voucher: { entity: "Voucher", listKey: "vouchers", singleKey: (id) => ["voucher", id] },
};

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const type = ENTITY_MAP[searchParams.get("type")] ? searchParams.get("type") : "document";
  const meta = ENTITY_MAP[type];
  const [renewOpen, setRenewOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState(null);

  const { data: doc, isLoading } = useQuery({
    queryKey: meta.singleKey(id),
    queryFn: () => db.entities[meta.entity].get(id),
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["renewalHistory", id],
    queryFn: () => db.entities.RenewalHistory.filter({ document_id: id }),
    enabled: !!id,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", "all"],
    queryFn: () => db.entities.FamilyProfile.list(),
  });

  const daysLeft = useMemo(() => getDaysLeft(doc?.expiry_date), [doc]);
  const status = getStatus(daysLeft);
  const cfg = STATUS_CONFIG[status];
  const profile = profiles.find((p) => p.id === doc?.profile_id);
  const isVoucher = type === "voucher";
  const isSubscription = type === "subscription";

  const handleDelete = async () => {
    const prev = queryClient.getQueryData([meta.listKey, "all"]);
    queryClient.setQueryData([meta.listKey, "all"], (old) =>
      (old || []).filter((d) => d.id !== id)
    );
    try {
      await db.entities[meta.entity].delete(id);
      toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted`, variant: "destructive" });
      navigate("/");
    } catch (e) {
      queryClient.setQueryData([meta.listKey, "all"], prev);
      toast({ title: "Failed to delete", variant: "destructive" });
    }
    queryClient.invalidateQueries({ queryKey: [meta.listKey] });
  };

  const handleArchive = async () => {
    const prev = queryClient.getQueryData([meta.listKey, "all"]);
    const newVal = !doc.archived;
    // When unarchiving a redeemed voucher, also clear the redeemed flag so it
    // returns to a clean active state.
    const shouldClearRedeemed = !newVal && isVoucher && doc.redeemed;
    const updateData = shouldClearRedeemed ? { archived: newVal, redeemed: false } : { archived: newVal };
    queryClient.setQueryData([meta.listKey, "all"], (old) =>
      (old || []).map((d) => (d.id === id ? { ...d, ...updateData } : d))
    );
    queryClient.setQueryData(meta.singleKey(id), (old) => (old ? { ...old, ...updateData } : old));
    try {
      await db.entities[meta.entity].update(id, updateData);
      toast({ title: newVal ? "Archived" : "Unarchived", variant: "success" });
    } catch (e) {
      queryClient.setQueryData([meta.listKey, "all"], prev);
      queryClient.setQueryData(meta.singleKey(id), doc);
      toast({ title: "Failed to archive", variant: "destructive" });
    }
    queryClient.invalidateQueries({ queryKey: meta.singleKey(id) });
    queryClient.invalidateQueries({ queryKey: [meta.listKey] });
  };

  const handleSnooze = async (untilDate) => {
    const prev = queryClient.getQueryData([meta.listKey, "all"]);
    queryClient.setQueryData([meta.listKey, "all"], (old) =>
      (old || []).map((d) => (d.id === id ? { ...d, snoozed_until: untilDate } : d))
    );
    queryClient.setQueryData(meta.singleKey(id), (old) => (old ? { ...old, snoozed_until: untilDate } : old));
    setSnoozeOpen(false);
    try {
      await db.entities[meta.entity].update(id, { snoozed_until: untilDate });
      toast({ title: "Reminder snoozed", variant: "success" });
    } catch (e) {
      queryClient.setQueryData([meta.listKey, "all"], prev);
      queryClient.setQueryData(meta.singleKey(id), doc);
      toast({ title: "Failed to snooze", variant: "destructive" });
    }
    queryClient.invalidateQueries({ queryKey: meta.singleKey(id) });
    queryClient.invalidateQueries({ queryKey: [meta.listKey] });
  };

  const handleToggleRedeemed = async () => {
    const newVal = !doc.redeemed;
    // When marking as redeemed, also archive the voucher so it's removed from
    // active lists, countdowns, and serenity score calculations. Un-redeeming
    // restores it to active (unarchived).
    const archived = newVal;
    queryClient.setQueryData(meta.singleKey(id), (old) => (old ? { ...old, redeemed: newVal, archived } : old));
    queryClient.setQueryData([meta.listKey, "all"], (old) =>
      (old || []).map((d) => (d.id === id ? { ...d, redeemed: newVal, archived } : d))
    );
    try {
      await db.entities[meta.entity].update(id, { redeemed: newVal, archived });
      toast({ title: newVal ? "Marked as redeemed & archived" : "Marked as unused", variant: "success" });
    } catch (e) {
      queryClient.setQueryData(meta.singleKey(id), doc);
      toast({ title: "Failed to update", variant: "destructive" });
    }
    queryClient.invalidateQueries({ queryKey: meta.singleKey(id) });
    queryClient.invalidateQueries({ queryKey: [meta.listKey] });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-border border-t-[#FF8C42] rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!doc) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Item not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pb-28 lg:pb-12 safe-top animate-route-in">
        <div className="max-w-2xl mx-auto w-full">
          {/* Status Header — glass card on gradient */}
          <div className="px-5 lg:px-8 pt-12 pb-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full glass-panel flex items-center justify-center active:scale-95 transition-transform">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/edit/${doc.id}?type=${type}`)} className="w-9 h-9 rounded-full glass-panel flex items-center justify-center active:scale-95 transition-transform">
                  <Pencil className="w-4 h-4 text-foreground" />
                </button>
                <button onClick={handleArchive} className="w-9 h-9 rounded-full glass-panel flex items-center justify-center active:scale-95 transition-transform">
                  <Archive className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>

            <div className="glass-card-soft rounded-3xl p-6 text-center" style={{ background: statusGradient(status) }}>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3 bg-white/90 dark:bg-black/30 text-foreground backdrop-blur-md shadow-sm">
                <div className={cn("w-2 h-2 rounded-full", cfg.dot, (status === "urgent" || status === "overdue") && "animate-breathe")} />
                {cfg.label}
                {doc.archived && <span className="ml-1 opacity-60">• Archived</span>}
                {isVoucher && doc.redeemed && <span className="ml-1 opacity-60">• Redeemed</span>}
              </div>
              <h1 className="text-white text-3xl lg:text-4xl font-display leading-tight">{doc.name}</h1>
              <p className="text-white/70 text-sm mt-1">
                {isVoucher
                  ? [doc.category, doc.store].filter(Boolean).join(" • ")
                  : [doc.category, doc.recurrence_type].filter(Boolean).join(" • ")}
              </p>

              <div className="mt-5 mb-1">
                {isVoucher && doc.redeemed ? (
                  <span className="text-white text-4xl font-display">Redeemed</span>
                ) : (
                  <>
                    <span className="text-white text-4xl font-display">
                      {daysLeft !== null && daysLeft < 0 ? Math.abs(daysLeft) : daysLeft}
                    </span>
                    <span className="text-white/80 text-sm ml-1.5">
                      {daysLeft !== null && daysLeft < 0 ? "days overdue" : "days left"}
                    </span>
                  </>
                )}
              </div>
              <p className="text-white/60 text-xs flex items-center gap-1 justify-center">
                <Calendar className="w-3 h-3" />
                {formatDate(doc.expiry_date)}
              </p>
            </div>
          </div>

          {/* Renewal URL button */}
          {doc.renewal_url && (
            <div className="px-5 lg:px-8 mt-3">
              <button
                onClick={() => {
                  const url = doc.renewal_url.startsWith("http") ? doc.renewal_url : `https://${doc.renewal_url}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                className="w-full flex items-center gap-3 glass-frost rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform"
              >
                <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shrink-0">
                  <ExternalLink className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium text-sm">Go to Renewal Site</p>
                  <p className="text-muted-foreground text-xs truncate">{doc.renewal_url}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          )}

          {/* Auto-pay badge for subscriptions */}
          {isSubscription && doc.auto_pay && (
            <div className="px-5 lg:px-8 mt-2">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 w-fit">
                <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-300 text-xs font-semibold">Auto-Pay enabled — renews automatically</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-5 lg:px-8 mt-3">
            <div className="glass-frost rounded-2xl p-2 grid grid-cols-3 gap-1 mt-0">
              {isVoucher ? (
                <ActionButton
                  icon={doc.redeemed ? CheckCircle2 : Ticket}
                  label={doc.redeemed ? "Redeemed" : "Redeem"}
                  onClick={handleToggleRedeemed}
                  tint={doc.redeemed ? "text-emerald-500" : "text-[#FF8C42]"}
                />
              ) : (
                <ActionButton icon={RefreshCw} label="Renew" onClick={() => setRenewOpen(true)} tint="text-[#FF8C42]" />
              )}
              <ActionButton icon={Bell} label="Snooze" onClick={() => setSnoozeOpen(true)} tint="text-amber-500" />
              <ActionButton icon={Trash2} label="Delete" onClick={() => setDeleteOpen(true)} tint="text-rose-500" />
            </div>
          </div>

          {/* Details */}
          <div className="px-5 lg:px-8 mt-3 space-y-3">
            {/* Profile */}
            {profile && (
              <div className="glass-frost rounded-2xl p-4 flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", (PROFILE_COLORS[profile.color] || PROFILE_COLORS.slate).bg)}>
                  <span className="text-white font-semibold text-xs">{profile.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Family Profile</p>
                  <p className="text-foreground font-medium text-sm">{profile.name} • {profile.relationship}</p>
                </div>
              </div>
            )}

            {/* Tags */}
            {doc.tags && doc.tags.length > 0 && (
              <div className="glass-frost rounded-2xl p-4">
                <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {doc.tags.map((t) => (
                    <span key={t} className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 text-foreground">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick info */}
            {(isVoucher ? (doc.value != null) : (doc.renewal_fee != null || doc.preparation_date || (doc.reminder_days && doc.reminder_days.length > 0))) && (
              <div className="glass-frost rounded-2xl p-4 space-y-2.5">
                {isVoucher && doc.value != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Voucher Value</span>
                    <span className="text-foreground font-semibold text-sm">{formatCurrency(doc.value)}</span>
                  </div>
                )}
                {!isVoucher && doc.renewal_fee != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Renewal Fee</span>
                    <span className="text-foreground font-semibold text-sm">{formatCurrency(doc.renewal_fee)}</span>
                  </div>
                )}
                {doc.preparation_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Start preparing by</span>
                    <span className="text-foreground font-semibold text-sm">{formatDate(doc.preparation_date)}</span>
                  </div>
                )}
                {doc.reminder_days && doc.reminder_days.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm flex items-center gap-1.5"><BellRing className="w-3.5 h-3.5" /> Reminders</span>
                    <span className="text-foreground font-semibold text-sm">{doc.reminder_days.join(", ")} days before</span>
                  </div>
                )}
              </div>
            )}

            {doc.notes && (
              <DetailCard title="Notes">
                <p className="text-foreground text-sm leading-relaxed">{doc.notes}</p>
              </DetailCard>
            )}

            {!isVoucher && doc.checklist && (
              <DetailCard title="Renewal Checklist">
                <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{doc.checklist}</p>
              </DetailCard>
            )}

            <DetailCard title="Attachment">
              {doc.attachment_url ? (
                <button
                  onClick={() => setImageViewerUrl(doc.attachment_url)}
                  className="w-full flex items-center gap-3 p-3 bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 rounded-xl text-left active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
                    <Paperclip className="w-5 h-5 text-[#FF8C42]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{doc.attachment_name || "View attachment"}</p>
                    <p className="text-xs text-muted-foreground">Tap to view</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">No attachment added yet.</p>
                </div>
              )}
            </DetailCard>

            {!isVoucher && (
              <DetailCard title="Renewal History">
                {history.length === 0 ? (
                  <div className="flex items-center gap-3 py-2">
                    <History className="w-5 h-5 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">No renewals recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.slice().sort((a, b) => new Date(b.renewed_date) - new Date(a.renewed_date)).map((h, idx) => (
                      <div key={h.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2.5 h-2.5 rounded-full accent-gradient mt-1.5" />
                          {idx < history.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="flex-1 pb-1">
                          <p className="text-sm text-foreground font-medium">Renewed on {formatDate(h.renewed_date)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">New expiry: {formatDate(h.new_expiry)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DetailCard>
            )}

            {doc.snoozed_until && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <p className="text-amber-700 dark:text-amber-300 text-sm">Reminder snoozed until {formatDate(doc.snoozed_until)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {renewOpen && !isVoucher && (
        <RenewSheet doc={doc} type={type} meta={meta} onClose={() => setRenewOpen(false)} onSuccess={() => {
          setRenewOpen(false);
          queryClient.invalidateQueries({ queryKey: meta.singleKey(id) });
          queryClient.invalidateQueries({ queryKey: ["renewalHistory", id] });
          queryClient.invalidateQueries({ queryKey: [meta.listKey] });
          toast({ title: "Renewed successfully", variant: "success" });
        }} />
      )}
      {snoozeOpen && <SnoozeSheet onClose={() => setSnoozeOpen(false)} onSnooze={handleSnooze} />}
      {deleteOpen && (
        <ConfirmDialog title={`Delete ${type}?`} message="This action cannot be undone." confirmLabel="Delete"
          onConfirm={handleDelete} onCancel={() => setDeleteOpen(false)} />
      )}
      {imageViewerUrl && (
        <ImageViewer url={imageViewerUrl} name={doc.attachment_name} onClose={() => setImageViewerUrl(null)} />
      )}
    </Layout>
  );
}

function statusGradient(status) {
  const map = {
    safe: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
    soon: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
    urgent: "linear-gradient(135deg, #FB923C 0%, #F97316 100%)",
    overdue: "linear-gradient(135deg, #FB7185 0%, #F43F5E 100%)",
    unknown: "linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)",
  };
  return map[status] || map.unknown;
}

function ActionButton({ icon: Icon, label, onClick, tint }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl active:bg-foreground/5 transition-colors">
      <Icon className={cn("w-5 h-5", tint)} />
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );
}

function DetailCard({ title, children }) {
  return (
    <div className="glass-frost rounded-2xl p-4">
      <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </div>
  );
}

function RenewSheet({ doc, type, meta, onClose, onSuccess }) {
  const [newExpiry, setNewExpiry] = useState(computeNextExpiry(doc.expiry_date, doc.recurrence_type) || "");
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const handleRenew = async () => {
    if (!newExpiry) return;
    setSaving(true);
    try {
      console.log("[RenewalHistory] Creating:", { doc: doc.name, prev: doc.expiry_date, next: newExpiry });
      await db.entities.RenewalHistory.create({
        document_id: doc.id, document_name: doc.name,
        renewed_date: today, previous_expiry: doc.expiry_date, new_expiry: newExpiry,
      });
      console.log("[RenewalHistory] ✅ Created for:", doc.name);
      await db.entities[meta.entity].update(doc.id, { expiry_date: newExpiry, snoozed_until: null });
      onSuccess();
    } catch (e) { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end animate-fade-in" onClick={onClose}>
      <div className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-2xl mx-auto box-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-foreground/15 rounded-full mx-auto mb-4" />
        <h3 className="text-foreground font-display text-2xl mb-1">Mark as Renewed</h3>
        <p className="text-muted-foreground text-sm mb-4">Set the new expiry date for {doc.name}.</p>
        <label className="block text-muted-foreground text-xs font-medium mb-1.5">New Expiry Date</label>
        <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)}
          className="block w-full min-w-0 rounded-2xl px-4 py-3 text-sm text-foreground outline-none border border-border focus:border-[#FF8C42] transition-colors mb-4 box-border bg-white/60 dark:bg-white/10" />
        <button onClick={handleRenew} disabled={!newExpiry || saving}
          className="w-full accent-gradient text-white rounded-full py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><RefreshCw className="w-4 h-4" /> Confirm Renewal</>}
        </button>
      </div>
    </div>
  );
}

function SnoozeSheet({ onClose, onSnooze }) {
  const presets = [{ label: "Later today", days: 0 }, { label: "Tomorrow", days: 1 }, { label: "3 days", days: 3 }, { label: "7 days", days: 7 }];
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end animate-fade-in" onClick={onClose}>
      <div className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-2xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-foreground/15 rounded-full mx-auto mb-4" />
        <h3 className="text-foreground font-semibold text-lg mb-4">Snooze Reminder</h3>
        <div className="space-y-1">
          {presets.map((p) => (
            <button key={p.label} onClick={() => { const d = new Date(); d.setDate(d.getDate() + p.days); onSnooze(d.toISOString().split("T")[0]); }}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-foreground/5">
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-8 animate-fade-in" onClick={onCancel}>
      <div className="glass-frost rounded-3xl p-6 w-full max-w-xs text-center animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-foreground font-semibold text-base mb-1">{title}</h3>
        <p className="text-muted-foreground text-sm mb-5">{message}</p>
        <div className="space-y-2">
          <button onClick={onConfirm} className="w-full bg-rose-500 text-white rounded-full py-3 font-semibold text-sm active:scale-[0.98] transition-transform">{confirmLabel}</button>
          <button onClick={onCancel} className="w-full text-muted-foreground font-medium text-sm py-2">Cancel</button>
        </div>
      </div>
    </div>
  );
}