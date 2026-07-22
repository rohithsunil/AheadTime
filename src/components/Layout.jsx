import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, FileText, Plus, Bell, Settings as SettingsIcon, Calendar, BarChart3, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { useTabHistory, isPrimaryTab } from "@/lib/TabHistoryContext";

const mobileNavItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: FileText, label: "Documents", path: "/documents" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { icon: SettingsIcon, label: "Settings", path: "/settings" },
];

const sidebarItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: FileText, label: "Documents", path: "/documents" },
  { icon: Calendar, label: "Calendar", path: "/calendar" },
  { icon: BarChart3, label: "Insights", path: "/insights" },
  { icon: Users, label: "Family Profiles", path: "/profiles" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { icon: SettingsIcon, label: "Settings", path: "/settings" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { navigateToTab } = useTabHistory();

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const handleNav = (path) => {
    haptic(8);
    if (isPrimaryTab(path)) navigateToTab(path);
    else navigate(path);
  };

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar — glass panel */}
      <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-64 glass-panel rounded-3xl flex-col z-40">
        <div className="px-6 pt-7 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shadow-md shadow-orange-500/30">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-foreground font-display text-2xl leading-none">AheadTime</h1>
              <p className="text-muted-foreground text-[11px] mt-1">Renewal Tracker</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors select-none text-left",
                  active ? "accent-gradient text-white shadow-md shadow-orange-500/20" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                )}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3">
          <button
            onClick={() => { haptic(12); navigate("/add"); }}
            className="w-full flex items-center justify-center gap-2 accent-gradient text-white rounded-xl py-3 font-semibold text-sm shadow-lg shadow-orange-500/30 active:scale-95 transition-transform select-none"
          >
            <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
            Add Document
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {children}
      </div>

      {/* Mobile floating glass nav */}
      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 select-none" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="glass-panel rounded-full flex items-center gap-0.5 px-2 py-2 shadow-2xl">
          {mobileNavItems.slice(0, 2).map((item) => (
            <NavButton key={item.path} item={item} active={isActive(item.path)} onNavigate={handleNav} />
          ))}

          <button
            onClick={() => { haptic(15); navigate("/add"); }}
            className="flex items-center justify-center w-12 h-12 -my-3 mx-1 accent-gradient rounded-full shadow-lg shadow-orange-500/40 ring-2 ring-white/40 dark:ring-white/10 transition-transform active:scale-90 select-none"
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
          </button>

          {mobileNavItems.slice(2).map((item) => (
            <NavButton key={item.path} item={item} active={isActive(item.path)} onNavigate={handleNav} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NavButton({ item, active, onNavigate }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onNavigate(item.path)}
      className={cn(
        "flex flex-col items-center justify-center w-11 h-11 rounded-full transition-colors select-none",
        active ? "accent-gradient text-white shadow-md shadow-orange-500/20" : "text-muted-foreground"
      )}
    >
      <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
    </button>
  );
}