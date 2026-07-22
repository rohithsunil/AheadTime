import React from "react";

// A custom flower/star logo mark — replaces the clock for a softer, zen aesthetic.
function FlowerLogo({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 6-petal flower */}
      <g fill="white">
        <ellipse cx="24" cy="10" rx="5" ry="8" />
        <ellipse cx="24" cy="10" rx="5" ry="8" transform="rotate(60 24 24)" />
        <ellipse cx="24" cy="10" rx="5" ry="8" transform="rotate(120 24 24)" />
        <ellipse cx="24" cy="10" rx="5" ry="8" transform="rotate(180 24 24)" />
        <ellipse cx="24" cy="10" rx="5" ry="8" transform="rotate(240 24 24)" />
        <ellipse cx="24" cy="10" rx="5" ry="8" transform="rotate(300 24 24)" />
      </g>
      <circle cx="24" cy="24" r="5" fill="#FF8C42" />
    </svg>
  );
}

// Auth layout redesigned — soft gradient, flower/star logo, better icon contrast
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 safe-top relative overflow-hidden">
      {/* Soft ambient glow blobs */}
      <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full bg-orange-300/20 dark:bg-orange-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-pink-300/20 dark:bg-pink-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand mark — flower/star logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl accent-gradient flex items-center justify-center shadow-lg shadow-orange-500/30 mb-3">
            <FlowerLogo className="w-8 h-8" />
          </div>
          <h1 className="text-foreground font-display text-2xl leading-none">AheadTime</h1>
          <p className="text-muted-foreground text-xs mt-1">Stay ahead of every renewal</p>
        </div>

        {/* Glass card */}
        <div className="glass-frost rounded-3xl p-7 shadow-xl">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-white/90 dark:bg-white/10 border border-orange-500/20 flex items-center justify-center shrink-0 shadow-sm">
              <Icon className="w-4 h-4 text-[#FF8C42] dark:text-orange-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-foreground text-lg font-display leading-tight">{title}</h2>
              {subtitle && <p className="text-muted-foreground text-xs mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {children}
        </div>

        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}

        <p className="text-center text-muted-foreground text-xs mt-8">AheadTime v2.3 — made with ❤️ by 8px Studio</p>
      </div>
    </div>
  );
}