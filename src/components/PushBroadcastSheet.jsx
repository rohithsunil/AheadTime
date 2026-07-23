import { db } from '@/api/db';
import { supabase } from '@/api/supabaseClient';

import React, { useState, useEffect } from "react";
import { X, Send, Megaphone, Bell } from "lucide-react";

import { toast } from "@/components/ui/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Admin-only sheet to compose and send a real Web Push broadcast to all subscribed devices.
export default function PushBroadcastSheet({ onClose }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(null);

  // Fetch subscriber count on mount
  useEffect(() => {
    supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setSubscriberCount(count ?? 0));
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      // 1. Store broadcast in DB using valid column names (title, message, sent_to_count)
      await db.entities.PushBroadcast.create({
        title: title.trim(),
        message: message.trim(),
        sent_to_count: subscriberCount || 0,
      });

      // 2. Call the Supabase Edge Function for real Web Push delivery if deployed
      let pushResultStr = "";
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/send-push-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            body: message.trim(),
            url: '/',
          }),
        }
      );

      if (resp.ok) {
        const result = await resp.json();
        pushResultStr = `${result.sent || 0} device(s) notified`;
      } else {
        const errData = await resp.json().catch(() => ({}));
        console.warn("Edge function broadcast error:", errData);
        pushResultStr = `Broadcast saved to DB (Push warning: ${errData.error || resp.status})`;
      }

      toast({
        title: "Broadcast sent ✅",
        description: pushResultStr || "Broadcast saved and dispatched.",
        variant: "success",
      });
      onClose();
    } catch (e) {
      console.error("Broadcast DB error:", e);
      toast({ title: "Failed to send broadcast", description: e?.message || "Database error", variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end animate-fade-in" onClick={sending ? undefined : onClose}>
      <div className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-3xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-foreground/15 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-base">Send Broadcast</h3>
              <p className="text-muted-foreground text-xs">
                Real push notification to all subscribed devices
              </p>
            </div>
          </div>
          {!sending && (
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Subscriber count badge */}
        {subscriberCount !== null && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground/5 mb-4">
            <Bell className="w-4 h-4 text-[#FF8C42]" />
            <span className="text-sm font-medium text-foreground">{subscriberCount} device{subscriberCount !== 1 ? 's' : ''} subscribed</span>
            {subscriberCount === 0 && (
              <span className="text-xs text-muted-foreground ml-1">— users must enable notifications in the app</span>
            )}
          </div>
        )}

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Broadcast title..."
              className="w-full bg-white/60 dark:bg-white/10 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF8C42] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Message</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Notification message..."
              className="w-full bg-white/60 dark:bg-white/10 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF8C42] transition-colors resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={!title.trim() || !message.trim() || sending}
          className="w-full accent-gradient text-white font-medium text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.99] transition-all shadow-md shadow-orange-500/20"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" /> Send Broadcast
            </>
          )}
        </button>
      </div>
    </div>
  );
}