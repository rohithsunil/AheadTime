import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Lock, Delete } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AppLockGate() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("aheadtime-unlocked") === "true");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const savedPin = typeof localStorage !== "undefined" ? localStorage.getItem("aheadtime-pin") : null;

  useEffect(() => {
    if (unlocked) sessionStorage.setItem("aheadtime-unlocked", "true");
  }, [unlocked]);

  if (!savedPin || unlocked) return <Outlet />;

  const handleUnlock = () => {
    if (pin === savedPin) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setPin(""), 100);
    }
  };

  return (
    <div className="min-h-screen app-gradient flex flex-col items-center justify-center px-6">
      <div className="w-16 h-16 rounded-3xl glass-card flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-white font-display text-3xl mb-2">Enter PIN</h1>
      <p className="text-white/60 text-sm mb-8">Unlock AheadTime</p>

      <div className="flex gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "w-3.5 h-3.5 rounded-full transition-colors",
              pin.length > i ? "bg-white" : "bg-white/20"
            )}
          />
        ))}
      </div>

      {error && <p className="text-rose-300 text-sm mb-4 animate-fade-in">Incorrect PIN. Try again.</p>}

      <div className="grid grid-cols-3 gap-3 max-w-xs w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => {
              if (pin.length < 4) {
                const newPin = pin + n;
                setPin(newPin);
                if (newPin.length === 4) setTimeout(handleUnlock, 200);
              }
            }}
            className="aspect-square glass-card rounded-2xl text-white text-xl font-medium active:scale-95 transition-transform flex items-center justify-center"
          >
            {n}
          </button>
        ))}
        <div />
        <button
          onClick={() => {
            const newPin = pin + "0";
            setPin(newPin);
            if (newPin.length === 4) setTimeout(handleUnlock, 200);
          }}
          className="aspect-square glass-card rounded-2xl text-white text-xl font-medium active:scale-95 transition-transform flex items-center justify-center"
        >
          0
        </button>
        <button
          onClick={() => setPin(pin.slice(0, -1))}
          className="aspect-square flex items-center justify-center text-white/60 active:scale-95 transition-transform"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}