import { db } from '@/api/db';

import React, { useState } from "react";
import { X, Send, Megaphone, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

// Admin-only sheet to compose and send a push broadcast to all registered users.
// Stores the broadcast in the PushBroadcast entity (so all users see it in-app)
// and sends an email to every registered user via SendEmail.
export default function PushBroadcastSheet({ onClose }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      // Fetch all registered users
      const users = await db.entities.User.list();

      // Store broadcast in DB so all users see it in-app
      await db.entities.PushBroadcast.create({
        title: title.trim(),
        message: message.trim(),
        sent_to_count: users.length,
      });

      // Send email to each registered user (SendEmail only reaches registered users)
      let emailCount = 0;
      for (const u of users) {
        if (!u.email) continue;
        try {
          await db.integrations.Core.SendEmail({
            to: u.email,
            subject: `AheadTime: ${title.trim()}`,
            body: message.trim(),
          });
          emailCount++;
        } catch {
          // Skip individual send failures â€” broadcast is still stored for in-app
        }
      }

      toast({
        title: "Broadcast sent",
        description: `${users.length} user${users.length !== 1 ? "s" : ""} notified â€¢ ${emailCount} email${emailCount !== 1 ? "s" : ""} delivered`,
        variant: "success",
      });
      onClose();
    } catch (e) {
      toast({ title: "Failed to send broadcast", variant: "destructive" });
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
              <p className="text-muted-foreground text-xs">Push notification to all registered users</p>
            </div>
          </div>
          {!sending && (
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

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

          <div className="flex items-center gap-2 px-1 text-muted-foreground text-xs">
            <Users className="w-3.5 h-3.5" />
            <span>Delivered as phone notification + in-app alert + email to all registered users</span>
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
                Send to All Users
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}