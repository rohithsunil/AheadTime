import { db } from '@/api/db';
import { supabase } from '@/api/supabaseClient';

import React, { useState, useEffect } from "react";
import { X, Send, Megaphone, Bell, CheckCircle2 } from "lucide-react";

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
      // 1. Store broadcast in DB for in-app display
      await db.entities.PushBroadcast.create({
        title: title.trim(),
        body: message.trim(),
        target_audience: 'all',
      });

      // 2. Call the Supabase Edge Function for real Web Push delivery
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/send-push-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            body: message.trim(),
            url: '/',
          }),
        }
      );

      const result = await resp.json();

      if (!resp.ok) throw new Error(result.error || 'Push delivery failed');

      toast({
        title: "Broadcast sent ✅",
        description: `${result.sent} device${result.sent !== 1 ? 's' : ''} notified${result.failed ? ` • ${result.failed} failed` : ''}`,
        variant: "success",
      });
      onClose();
    } catch (e) {
      toast({ title: "Failed to send broadcast", description: e.message, variant: "destructive" });
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

        <div className="space-y-3">
          <div>
            <label className="text-muted-foreground text-xs font-medium mb-1.5 px-1 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New feature available!"
              maxLength={80}
              className="w-full bg-white/60 dark:bg-white/10 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-[#FF8C42] transition-colors"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs font-medium mb-1.5 px-1 block">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message to all users..."
              rows={4}
              maxLength={500}
              className="w-full bg-white/60 dark:bg-white/10 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-[#FF8C42] transition-colors resize-none"
            />
          </div>

          <div className="flex items-start gap-2 px-1 text-muted-foreground text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-green-500 shrink-0" />
            <span>Delivers as a real phone notification even when the app is closed. Users must have enabled notifications in the app first.</span>
          </div>

          <button
            onClick={handleSend}
            disabled={!title.trim() || !message.trim() || sending}
            className="w-full accent-gradient text-white rounded-full py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending broadcast...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to All Devices
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}