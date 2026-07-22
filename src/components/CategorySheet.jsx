import React, { useState } from "react";
import { Plus, Check } from "lucide-react";
import { getIconComponent, getColorClass } from "@/lib/categoryUtils";
import { cn } from "@/lib/utils";

export default function CategorySheet({ categories, selected, onSelect, onCreate, onClose }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      onSelect(name);
      return;
    }
    onCreate(name);
    setNewName("");
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end animate-fade-in" onClick={onClose}>
      <div
        className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-2xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-foreground/15 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-foreground font-semibold text-base">Select Category</h3>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1 text-[#FF8C42] dark:text-orange-400 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          )}
        </div>

        {creating && (
          <div className="flex items-center gap-2 mb-3 animate-fade-in">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
              placeholder="Category name..."
              className="flex-1 glass-frost rounded-xl px-4 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
            />
            <button
              onClick={handleCreate}
              className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shrink-0"
            >
              <Check className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
          {categories.map((cat) => {
            const Icon = getIconComponent(cat.icon);
            const colorClass = getColorClass(cat.color);
            const active = selected === cat.name;
            return (
              <button
                key={cat.id || cat.name}
                onClick={() => onSelect(cat.name)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  active ? "accent-gradient text-white" : "glass-frost text-foreground"
                )}
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="truncate">{cat.name}</span>
              </button>
            );
          })}
        </div>

        {categories.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-4">
            No categories yet. Create one above.
          </p>
        )}
      </div>
    </div>
  );
}