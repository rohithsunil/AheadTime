import { db } from '@/api/db';

import React, { useState, useEffect } from "react";
import { Megaphone, X } from "lucide-react";

import { useQuery } from "@tanstack/react-query";

const LAST_SEEN_KEY = "aheadtime-last-seen-broadcast";
const NOTIFIED_KEY = "aheadtime-broadcast-notified";

// Shows the latest broadcast created AFTER the user's last visit as a modal,
// AND fires a system Notification so it appears in the phone's notification center.
// Uses a timestamp approach: on each app open, we mark "last seen" as now,
// so old broadcasts never reappear and new users start fresh (see only the latest).
export default function BroadcastModal() {
  const [dismissed, setDismissed] = useState(false);

  const { data: broadcasts = [] } = useQuery({
    queryKey: ["pushBroadcasts"],
    queryFn: () => db.entities.PushBroadcast.list("-created_date", 10),
  });

  // Get the last seen timestamp â€” only show broadcasts created after this.
  // If never seen before (new user), use epoch so they see the latest one once.
  const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
  const lastSeenDate = lastSeen ? new Date(lastSeen) : new Date(0);

  const latest = broadcasts.find((b) => new Date(b.created_date) > lastSeenDate);

  // Update last seen timestamp on mount â€” this prevents old broadcasts from
  // reappearing on subsequent app opens.
  useEffect(() => {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
  }, []);

  // Fire a system notification for the new broadcast so it appears in the
  // phone's notification center (like WhatsApp), not just as an in-app modal.
  useEffect(() => {
    if (!latest) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      const notified = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "{}");
      if (notified[latest.id]) return;
      new Notification(latest.title, {
        body: latest.message,
        tag: `aheadtime-broadcast-${latest.id}`,
      });
      notified[latest.id] = true;
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified));
    } catch {
      // Notification might not work in all contexts â€” modal still shows
    }
  }, [latest]);

  if (!latest || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-[65] bg-black/40 flex items-center justify-center px-6 animate-fade-in" onClick={dismiss}>
      <div className="glass-frost rounded-3xl p-6 w-full max-w-sm animate-scale-in text-center relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center mx-auto mb-4">
          <Megaphone className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-foreground font-display text-xl mb-2">{latest.title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-5">{latest.message}</p>
        <button
          onClick={dismiss}
          className="w-full accent-gradient text-white rounded-full py-3 font-semibold text-sm active:scale-[0.98] transition-transform"
        >
          Got it
        </button>
      </div>
    </div>
  );
}