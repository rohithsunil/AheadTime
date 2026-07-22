import { db } from '@/api/db';

import React, { useState } from "react";
import { X, Sparkles, Plus, Trash2, History } from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

export default function ChangelogPopup({ onClose, isAdmin }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [newEntry, setNewEntry] = useState({ version: "", title: "", features: [""] });

  const { data: entries = [] } = useQuery({
    queryKey: ["changelog"],
    queryFn: () => db.entities.ChangelogEntry.list("-date", 20),
  });

  const handleAdd = async () => {
    if (!newEntry.version || !newEntry.title) return;
    try {
      await db.entities.ChangelogEntry.create({
        version: newEntry.version,
        title: newEntry.title,
        features: newEntry.features.filter((f) => f.trim()),
        date: new Date().toISOString().split("T")[0],
      });
      queryClient.invalidateQueries({ queryKey: ["changelog"] });
      setNewEntry({ version: "", title: "", features: [""] });
      toast({ title: "Changelog entry added", variant: "success" });
    } catch (e) {
      toast({ title: "Failed to add entry", variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    try {
      await db.entities.ChangelogEntry.delete(id);
      queryClient.invalidateQueries({ queryKey: ["changelog"] });
      toast({ title: "Entry deleted", variant: "destructive" });
    } catch (e) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end animate-fade-in" onClick={onClose}>
      <div className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-3xl mx-auto max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-foreground/15 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#FF8C42]" />
            <h3 className="text-foreground font-semibold text-base">What's New</h3>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => setEditing(!editing)} className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors", editing ? "accent-gradient text-white" : "hover:bg-foreground/5")}>
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {editing && isAdmin && (
          <div className="rounded-2xl p-4 mb-4 space-y-3 animate-fade-in border border-[#FF8C42]/20" style={{ background: "rgba(255,140,66,0.08)" }}>
            <div className="flex gap-2">
              <input value={newEntry.version} onChange={(e) => setNewEntry({ ...newEntry, version: e.target.value })} placeholder="Version (e.g. 2.4)" className="flex-1 bg-white/60 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-[#FF8C42]" />
              <input value={newEntry.title} onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })} placeholder="Update title" className="flex-1 bg-white/60 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-[#FF8C42]" />
            </div>
            {newEntry.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#FF8C42] shrink-0" />
                <input value={f} onChange={(e) => {
                  const features = [...newEntry.features];
                  features[i] = e.target.value;
                  setNewEntry({ ...newEntry, features });
                }} placeholder="Feature description" className="flex-1 bg-white/60 dark:bg-white/5 border border-border rounded-xl px-3 py-1.5 text-sm text-foreground outline-none focus:border-[#FF8C42]" />
                {newEntry.features.length > 1 && (
                  <button onClick={() => setNewEntry({ ...newEntry, features: newEntry.features.filter((_, idx) => idx !== i) })} className="w-7 h-7 rounded-full hover:bg-foreground/5 flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setNewEntry({ ...newEntry, features: [...newEntry.features, ""] })} className="text-[#FF8C42] dark:text-orange-400 text-xs font-medium">+ Add feature</button>
            <button onClick={handleAdd} disabled={!newEntry.version || !newEntry.title} className="w-full accent-gradient text-white rounded-full py-2.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform">
              Publish Update
            </button>
          </div>
        )}

        <div className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No updates yet. Check back soon!</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="glass-frost rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#FF8C42] dark:text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40">v{entry.version}</span>
                    <h4 className="text-foreground text-sm font-semibold">{entry.title}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    {entry.date && <span className="text-muted-foreground text-[10px]">{new Date(entry.date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</span>}
                    {isAdmin && (
                      <button onClick={() => handleDelete(entry.id)} className="w-7 h-7 rounded-full hover:bg-foreground/5 flex items-center justify-center">
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    )}
                  </div>
                </div>
                {entry.features && entry.features.length > 0 && (
                  <ul className="space-y-1.5">
                    {entry.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#FF8C42] shrink-0 mt-0.5" />
                        <span className="text-muted-foreground text-xs">{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}