import React, { useState, useEffect } from "react";
import { Share, Plus, X } from "lucide-react";
import { haptic } from "@/lib/haptics";

// Detects iOS Safari (not installed as PWA) and shows a custom "Add to Home Screen" banner
export default function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("aheadtime-pwa-install-dismissed");
    if (dismissed) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    // Check if already running as a standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isIOS && isSafari && !isStandalone) {
      // Show after a short delay so it doesn't interrupt the initial load
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    haptic(8);
    localStorage.setItem("aheadtime-pwa-install-dismissed", "true");
    setVisible(false);
  };

  const handleShowSteps = () => {
    haptic(10);
    setShowSteps(true);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[55] max-w-md mx-auto animate-slide-up">
      <div className="glass-frost rounded-2xl p-4 shadow-2xl border border-white/40 dark:border-white/10">
        {showSteps ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground font-semibold text-sm">Add to Home Screen</h3>
              <button onClick={handleDismiss} className="w-7 h-7 rounded-full hover:bg-foreground/5 flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full accent-gradient flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">1</span>
                <p className="text-foreground text-sm">Tap the <Share className="inline w-4 h-4 text-[#FF8C42] mx-0.5 -mt-0.5" /> Share button in Safari's bottom toolbar</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full accent-gradient flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">2</span>
                <p className="text-foreground text-sm">Scroll down and tap <span className="font-semibold">"Add to Home Screen"</span></p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full accent-gradient flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">3</span>
                <p className="text-foreground text-sm">Tap <span className="font-semibold">"Add"</span> — AheadTime will appear on your home screen</p>
              </li>
            </ol>
            <button onClick={handleDismiss} className="w-full mt-4 accent-gradient text-white rounded-full py-3 font-semibold text-sm active:scale-[0.98] transition-transform">
              Got it
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium text-sm">Install AheadTime</p>
              <p className="text-muted-foreground text-xs mt-0.5">Add to your Home Screen for the full app experience</p>
            </div>
            <button onClick={handleShowSteps} className="accent-gradient text-white rounded-full px-4 py-2 text-xs font-semibold shrink-0 active:scale-95 transition-transform">
              Install
            </button>
            <button onClick={handleDismiss} className="w-7 h-7 rounded-full hover:bg-foreground/5 flex items-center justify-center shrink-0">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}