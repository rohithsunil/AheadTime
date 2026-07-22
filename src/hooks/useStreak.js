import { db } from '@/api/db';

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Server-side streak tracking — stored in StreakRecord entity so it syncs
// across all devices for the same user account.
// A streak day = the app was opened that day (resets at LOCAL midnight).

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diffDays(a, b) {
  if (!a || !b) return Infinity;
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}

export function useStreak() {
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);
  const checkedIn = useRef(false);

  const { data: record, isLoading } = useQuery({
    queryKey: ["streakRecord"],
    queryFn: async () => {
      const records = await db.entities.StreakRecord.list();
      return records[0] || null;
    },
  });

  // Check in on mount — increment streak if first open today
  useEffect(() => {
    if (isLoading || checkedIn.current) return;
    checkedIn.current = true;

    const today = todayStr();

    const checkIn = async () => {
      try {
        if (!record) {
          const rec = await db.entities.StreakRecord.create({
            current_streak: 1,
            best_streak: 1,
            last_check_in: today,
            total_check_ins: 1,
          });
          queryClient.setQueryData(["streakRecord"], rec);
          return;
        }

        if (record.last_check_in === today) return; // already checked in today

        const gap = diffDays(record.last_check_in, today);
        const newStreak = gap === 1 ? (record.current_streak || 0) + 1 : 1;
        const newBest = Math.max(record.best_streak || 0, newStreak);

        const updated = await db.entities.StreakRecord.update(record.id, {
          current_streak: newStreak,
          best_streak: newBest,
          last_check_in: today,
          total_check_ins: (record.total_check_ins || 0) + 1,
        });
        queryClient.setQueryData(["streakRecord"], { ...record, ...updated });
      } catch {
        // network error — streak will sync next time
      }
    };

    checkIn();
  }, [isLoading, record, queryClient]);

  const streak = record?.current_streak || 0;
  const best = record?.best_streak || 0;
  const today = todayStr();
  const canClaim = streak > 0 && record?.last_claim_date !== today;

  const claimStreak = useCallback(async () => {
    if (!canClaim || claiming) return;
    setClaiming(true);
    try {
      if (record) {
        const updated = await db.entities.StreakRecord.update(record.id, {
          last_claim_date: today,
        });
        queryClient.setQueryData(["streakRecord"], { ...record, ...updated });
      }
      // Fire confetti celebration
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ["#FF8C42", "#FFB088", "#F0708E", "#FFD700", "#FF6B6B"],
      });
      // Second burst for extra effect
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 100,
          origin: { y: 0.6 },
          colors: ["#FF8C42", "#FFD700", "#FFB088"],
        });
      }, 200);
    } catch {
      // ignore
    }
    setClaiming(false);
  }, [canClaim, claiming, record, today, queryClient]);

  return { streak, best, canClaim, claimStreak, claiming };
}