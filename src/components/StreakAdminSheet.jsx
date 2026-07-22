import { db } from '@/api/db';

import React, { useState } from "react";
import { Flame, X } from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { haptic } from "@/lib/haptics";
import { toast } from "@/components/ui/use-toast";

// Admin-only sheet for adjusting another user's streak count (for testing).
export default function StreakAdminSheet({ onClose }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [count, setCount] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: adjustments = [] } = useQuery({
    queryKey: ["streakAdjustments"],
    queryFn: () => db.entities.StreakAdjustment.list(),
  });

  const handleSave = async () => {
    if (!email.trim() || !count) return;
    setSaving(true);
    haptic(10);
    try {
      const existing = adjustments.find((a) => a.target_email === email.trim());
      if (existing) {
        await db.entities.StreakAdjustment.update(existing.id, { streak_count: parseInt(count, 10) });
      } else {
        await db.entities.StreakAdjustment.create({ target_email: email.trim(), streak_count: parseInt(count, 10) });
      }
      queryClient.invalidateQueries({ queryKey: ["streakAdjustments"] });
      toast({ title: "Streak adjusted", description: `${email} â†’ ${count} days`, variant: "success" });
      setEmail("");
      setCount("");
    } catch {
      toast({ title: "Failed to adjust streak", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    haptic(10);
    try {
      await db.entities.StreakAdjustment.delete(id);
      queryClient.invalidateQueries({ queryKey: ["streakAdjustments"] });
      toast({ title: "Adjustment removed", variant: "default" });
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end animate-fade-in" onClick={onClose}>
      <div className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-3xl mx-auto max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-foreground/15 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#FF8C42]" />
            <h3 className="text-foreground font-semibold text-base">Streak Testing</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-muted-foreground text-xs mb-4">Set a streak count for any user by email. They'll see the higher of their real streak or this value.</p>

        <div className="flex items-center gap-2 mb-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@email.com"
            className="flex-1 min-w-0 glass-frost rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
          />
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="days"
            className="w-20 glass-frost rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
          />
          <button
            onClick={handleSave}
            disabled={!email.trim() || !count || saving}
            className="accent-gradient text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform shrink-0"
          >
            Set
          </button>
        </div>

        {adjustments.length > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-2 px-1">Active Adjustments</p>
            {adjustments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-foreground/5">
                <Flame className="w-4 h-4 text-[#FF8C42] shrink-0" />
                <span className="flex-1 text-sm text-foreground truncate">{a.target_email}</span>
                <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{a.streak_count} days</span>
                <button onClick={() => handleDelete(a.id)} className="text-rose-500 text-xs font-medium shrink-0">Remove</button>
              </div>
            ))}
          </div>
        )}

        {adjustments.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-4">No adjustments yet.</p>
        )}
      </div>
    </div>
  );
}