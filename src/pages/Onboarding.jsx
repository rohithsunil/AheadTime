import { db } from '@/api/db';

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Bell, Lock, ChevronRight, Check, Sun, Moon, Contrast, Monitor, Sparkles } from "lucide-react";
import { requestNotificationPermission, setNotificationSetting } from "@/lib/reminderChecker";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

import { useQueryClient } from "@tanstack/react-query";

const SLIDES = [
  {
    icon: ShieldCheck,
    title: "Track your renewals\nin one place",
    subtitle: "Documents, subscriptions, bills, warranties — all organized and visible at a glance.",
    gradient: "linear-gradient(160deg, #FFD4A8 0%, #FFB088 35%, #F0A8C8 100%)",
    darkGradient: "linear-gradient(160deg, #1A1020 0%, #2A1428 40%, #3A1424 100%)",
    statusBarColor: "#FFD4A8",
    darkStatusBarColor: "#1A1020",
    glow1: "bg-white/30 dark:bg-orange-500/15",
    glow2: "bg-white/20 dark:bg-pink-500/10",
  },
  {
    icon: Bell,
    title: "Get reminders before\ndeadlines",
    subtitle: "Stay ahead with gentle alerts at 30, 7, and 0 days before each expiry.",
    gradient: "linear-gradient(160deg, #C8B8FF 0%, #D8B8F0 35%, #F0A8D8 100%)",
    darkGradient: "linear-gradient(160deg, #12102A 0%, #1C1430 40%, #2A1430 100%)",
    statusBarColor: "#C8B8FF",
    darkStatusBarColor: "#12102A",
    glow1: "bg-white/30 dark:bg-violet-500/15",
    glow2: "bg-white/20 dark:bg-pink-500/10",
  },
  {
    icon: Lock,
    title: "Keep everything\nprivate & secure",
    subtitle: "Your personal records stay protected with an optional PIN lock.",
    gradient: "linear-gradient(160deg, #A8D8F0 0%, #B8C8F0 35%, #C8B8F0 100%)",
    darkGradient: "linear-gradient(160deg, #0E1424 0%, #14182E 40%, #1C1430 100%)",
    statusBarColor: "#A8D8F0",
    darkStatusBarColor: "#0E1424",
    glow1: "bg-white/30 dark:bg-blue-500/15",
    glow2: "bg-white/20 dark:bg-violet-500/10",
  },
];

const THEME_OPTIONS = [
  { value: "light", icon: Sun, label: "Light", desc: "Bright & warm" },
  { value: "dark", icon: Moon, label: "Dark", desc: "Easy on eyes" },
  { value: "amoled", icon: Contrast, label: "AMOLED", desc: "Deep dark" },
  { value: "system", icon: Monitor, label: "Auto", desc: "Follow device" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(theme || "light");
  const [userName, setUserName] = useState("");
  const [saving, setSaving] = useState(false);
  const { subscribe: subscribePush, isSubscribed: isPushSubscribed } = usePushNotifications();

  const totalSteps = SLIDES.length + 3; // 3 slides + theme + name + finish
  const isDark = theme === "dark" || theme === "amoled" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Pre-fill name from email
  useEffect(() => {
    db.auth.me().then((u) => {
      if (u?.full_name) setUserName(u.full_name.split("@")[0].replace(/[._]/g, " "));
    }).catch(() => {});
  }, []);

  // Apply theme preview immediately when user picks
  useEffect(() => {
    if (step === SLIDES.length + 1) setTheme(selectedTheme);
  }, [selectedTheme, step, setTheme]);

  // Update status bar color to match the current slide's gradient so it blends
  // seamlessly. Restores the normal app status bar color on unmount.
  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) return;

    const isSlideStep = step < SLIDES.length || step === totalSteps - 1;
    if (isSlideStep) {
      const slideIndex = Math.min(step, SLIDES.length - 1);
      const s = SLIDES[slideIndex];
      themeColorMeta.content = isDark ? s.darkStatusBarColor : s.statusBarColor;
    } else {
      themeColorMeta.content = theme === "amoled" ? "#000000" : isDark ? "#0C0E1E" : "#FDFDFD";
    }

    return () => {
      const stored = localStorage.getItem("aheadtime-theme") || "light";
      const darkRestore = stored === "dark" || stored === "amoled" || (stored === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      themeColorMeta.content = stored === "amoled" ? "#000000" : darkRestore ? "#0C0E1E" : "#FDFDFD";
    };
  }, [step, isDark, theme, totalSteps]);

  const isLast = step === totalSteps - 1;

  const handleNext = async () => {
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else if (step === SLIDES.length - 1) {
      // Entering name step
      setStep(step + 1);
    } else if (step === SLIDES.length) {
      // Entering theme step
      setStep(step + 1);
    } else if (step === SLIDES.length + 1) {
      // Entering finish step
      setStep(step + 1);
    } else if (isLast) {
      // Finish
      setSaving(true);
      try {
        if (notifEnabled) {
          // Request local reminder permission
          requestNotificationPermission().then((granted) => {
            if (granted) setNotificationSetting(true);
          });
          // Subscribe to real Web Push notifications
          subscribePush().catch(() => {});
        }
        await db.auth.updateMe({
          display_name: userName.trim() || undefined,
          preferred_theme: selectedTheme,
        });
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      } catch (e) {
        // non-blocking
      }
      localStorage.setItem("aheadtime-onboarded", "true");
      navigate("/");
    }
  };

  const skip = () => {
    localStorage.setItem("aheadtime-onboarded", "true");
    navigate("/");
  };

  // --- Theme selection step ---
  if (step === SLIDES.length + 1) {
    return (
      <div className="fixed inset-0 flex items-center justify-center lg:p-8 safe-top overflow-hidden overscroll-none">
        <div className="w-full max-w-md h-full lg:h-[600px] lg:rounded-[2rem] flex flex-col px-8 pt-8 pb-8 glass-frost relative overflow-hidden">
          <div className="flex justify-end">
            <button onClick={skip} className="text-foreground/50 text-sm font-medium">Skip</button>
          </div>
          <div className="flex flex-col items-center text-center mt-6 mb-6">
            <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-foreground text-3xl font-display leading-tight">Choose your vibe</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-xs">Pick a theme — you can change it later in Settings.</p>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = selectedTheme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelectedTheme(opt.value)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-[0.98] select-none",
                    active ? "border-[#FF8C42] bg-[#FF8C42]/10" : "border-border bg-foreground/5"
                  )}
                >
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", active ? "accent-gradient" : "glass-frost")}>
                    <Icon className={cn("w-5 h-5", active ? "text-white" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-foreground font-semibold text-sm">{opt.label}</p>
                    <p className="text-muted-foreground text-xs">{opt.desc}</p>
                  </div>
                  {active && <Check className="w-5 h-5 text-[#FF8C42]" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleNext}
            className="w-full bg-[#1A1A1A] dark:bg-white dark:text-[#1A1A1A] text-white rounded-full py-4 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform select-none"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // --- Name entry step ---
  if (step === SLIDES.length) {
    return (
      <div className="fixed inset-0 flex items-center justify-center lg:p-8 safe-top overflow-hidden overscroll-none">
        <div className="w-full max-w-md h-full lg:h-[600px] lg:rounded-[2rem] flex flex-col px-8 pt-8 pb-8 glass-frost relative overflow-hidden">
          <div className="flex justify-end">
            <button onClick={skip} className="text-foreground/50 text-sm font-medium">Skip</button>
          </div>
          <div className="flex flex-col items-center text-center mt-6 mb-6">
            <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center mb-4">
              <span className="text-2xl">👋</span>
            </div>
            <h1 className="text-foreground text-3xl font-display leading-tight">What's your name?</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-xs">We'll greet you personally across the app.</p>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <input
              autoFocus
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && userName.trim()) handleNext(); }}
              placeholder="Your name"
              className="w-full bg-white/80 dark:bg-white/10 border-2 border-border rounded-2xl px-5 py-4 text-foreground text-lg font-medium outline-none focus:border-[#FF8C42] transition-colors text-center"
            />
          </div>
          <button
            onClick={handleNext}
            disabled={!userName.trim()}
            className="w-full bg-[#1A1A1A] dark:bg-white dark:text-[#1A1A1A] text-white rounded-full py-4 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40 select-none"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // --- Intro slides + finish ---
  const slide = SLIDES[Math.min(step, SLIDES.length - 1)];
  const Icon = slide.icon;
  const showNotif = isLast;

  return (
    <div className="fixed inset-0 flex items-center justify-center lg:p-8 safe-top overflow-hidden overscroll-none">
      <div
        className="w-full max-w-md h-full lg:h-[600px] lg:rounded-[2rem] flex flex-col px-8 pt-8 pb-8 lg:shadow-2xl relative overflow-hidden"
        style={{ background: isDark ? slide.darkGradient : slide.gradient }}
      >
        {/* Ambient glow blobs */}
        <div className={cn("absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl pointer-events-none", slide.glow1)} />
        <div className={cn("absolute -bottom-24 -left-24 w-56 h-56 rounded-full blur-3xl pointer-events-none", slide.glow2)} />
        {/* Floating decorative dots */}
        <div className="absolute top-20 left-12 w-2 h-2 rounded-full bg-white/40 dark:bg-white/15 animate-pulse" />
        <div className="absolute top-40 right-16 w-1.5 h-1.5 rounded-full bg-white/30 dark:bg-white/10 animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute bottom-40 left-20 w-2.5 h-2.5 rounded-full bg-white/25 dark:bg-white/8 animate-pulse" style={{ animationDelay: "1s" }} />

        <div className="flex justify-end relative z-10">
          <button onClick={skip} className="text-foreground/50 text-sm font-medium backdrop-blur-sm bg-white/20 dark:bg-white/5 rounded-full px-3 py-1">Skip</button>
        </div>

        <div className="flex gap-1.5 mt-6 relative z-10">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-8 bg-white/80 shadow-sm" : "w-1.5 bg-foreground/15"
              )}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
          {/* Immersive floating icon */}
          <div className="relative mb-8 animate-spring-in" key={step}>
            <div className="absolute inset-0 rounded-[2rem] bg-white/20 dark:bg-white/5 blur-2xl scale-110" />
            <div className="relative w-32 h-32 rounded-[2.5rem] glass-card flex items-center justify-center shadow-2xl">
              <Icon className="w-14 h-14 text-white drop-shadow-lg" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-white text-4xl font-display leading-tight whitespace-pre-line mb-4 drop-shadow-md">
            {showNotif ? "You're all set!\nReady to track? 🎉" : slide.title}
          </h1>
          <p className="text-white/75 text-sm leading-relaxed max-w-xs drop-shadow-sm">
            {showNotif ? "Enable notifications so you never miss a renewal deadline." : slide.subtitle}
          </p>

          {showNotif && (
            <button
              onClick={() => setNotifEnabled(!notifEnabled)}
              className="mt-8 flex items-center gap-3 glass-card rounded-2xl px-5 py-3"
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-md flex items-center justify-center transition-colors",
                  notifEnabled ? "accent-gradient" : "border-2 border-white/40"
                )}
              >
                {notifEnabled && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
              <span className="text-white text-sm font-medium drop-shadow-sm">Enable notifications</span>
            </button>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={saving}
          className="w-full bg-[#1A1A1A] dark:bg-white dark:text-[#1A1A1A] text-white rounded-full py-4 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform relative z-10 select-none disabled:opacity-60"
        >
          {saving ? "Setting up..." : isLast ? "Start Tracking" : "Continue"}
          {!isLast && !saving && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}