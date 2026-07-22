import { db } from '@/api/db';

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Star, Trash2, X, Edit3, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import { useQuery } from "@tanstack/react-query";
import { getDaysLeft } from "@/lib/renewalUtils";
import { getIconComponent, getColorClass, ICON_NAMES, COLOR_NAMES, COLOR_MAP } from "@/lib/categoryUtils";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { toast } from "@/components/ui/use-toast";

export default function Categories() {
  const navigate = useNavigate();
  const { data: categories = [], isLoading: catLoading, invalidate } = useCategories();
  const { data: documents = [] } = useQuery({ queryKey: ["documents", "all"], queryFn: () => db.entities.Document.list() });
  const { data: subscriptions = [] } = useQuery({ queryKey: ["subscriptions", "all"], queryFn: () => db.entities.Subscription.list() });
  const { data: vouchers = [] } = useQuery({ queryKey: ["vouchers", "all"], queryFn: () => db.entities.Voucher.list() });
  const [showEditor, setShowEditor] = useState(false);
  const [editingCat, setEditingCat] = useState(null);

  const allItems = useMemo(() => [
    ...documents.map((d) => ({ ...d, _type: "document" })),
    ...subscriptions.map((s) => ({ ...s, _type: "subscription" })),
    ...vouchers.map((v) => ({ ...v, _type: "voucher" })),
  ], [documents, subscriptions, vouchers]);

  const categoryStats = useMemo(() => {
    return categories.map((cat) => {
      const items = allItems.filter((d) => d.category === cat.name && !d.archived);
      const urgent = items.filter((d) => { const dl = getDaysLeft(d.expiry_date); return dl !== null && dl <= 30; }).length;
      const overdue = items.filter((d) => getDaysLeft(d.expiry_date) < 0).length;
      return { ...cat, count: items.length, urgent, overdue };
    });
  }, [categories, allItems]);

  const totalItems = allItems.filter((d) => !d.archived).length;
  const favCount = categories.filter((c) => c.favourite).length;

  const toggleFavourite = async (cat) => {
    try {
      await db.entities.Category.update(cat.id, { favourite: !cat.favourite });
      invalidate();
    } catch (e) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const deleteCategory = async (cat) => {
    if (categoryStats.find((c) => c.id === cat.id)?.count > 0) {
      toast({ title: "Cannot delete", description: "This category has items. Move or delete them first.", variant: "destructive" });
      return;
    }
    try {
      await db.entities.Category.delete(cat.id);
      invalidate();
      toast({ title: "Category deleted", variant: "success" });
    } catch (e) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleReorder = async (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = Array.from(categoryStats);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    try {
      await db.entities.Category.bulkUpdate(
        reordered.map((cat, i) => ({ id: cat.id, sort_order: i }))
      );
      invalidate();
    } catch (e) {
      toast({ title: "Failed to reorder", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen pb-28 safe-top animate-route-in">
        <div className="px-5 lg:px-10 pt-12 pb-2">
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-full glass-panel flex items-center justify-center active:scale-95 transition-transform">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-foreground text-3xl lg:text-4xl font-display">Categories</h1>
                <p className="text-muted-foreground text-sm mt-1">{totalItems} items • {categories.length} categories • {favCount} favourites</p>
              </div>
              <button
                onClick={() => { setEditingCat(null); setShowEditor(true); }}
                className="w-11 h-11 rounded-full accent-gradient flex items-center justify-center active:scale-95 transition-transform"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 lg:px-10 pt-4 max-w-3xl mx-auto w-full">
          <p className="text-xs text-muted-foreground mb-3 px-1">Drag the handle to reorder • Tap the star to pin favourites</p>
          {catLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => <div key={i} className="glass-frost rounded-2xl h-16 animate-pulse" />)}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleReorder}>
              <Droppable droppableId="categories">
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2.5">
                    {categoryStats.map((cat, index) => {
                      const Icon = getIconComponent(cat.icon);
                      return (
                        <Draggable key={cat.id} draggableId={cat.id} index={index}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={cn(
                                "w-full glass-frost rounded-2xl p-4 flex items-center gap-3 transition-shadow",
                                snap.isDragging && "shadow-2xl ring-2 ring-[#FF8C42]"
                              )}
                            >
                              <div {...prov.dragHandleProps} className="shrink-0 cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                              </div>
                              <button
                                onClick={() => toggleFavourite(cat)}
                                className="shrink-0 active:scale-90 transition-transform"
                              >
                                <Star className={cn("w-5 h-5", cat.favourite ? "text-amber-400 fill-amber-400" : "text-muted-foreground/40")} />
                              </button>
                              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", getColorClass(cat.color))}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <button
                                onClick={() => navigate(`/documents?category=${encodeURIComponent(cat.name)}`)}
                                className="flex-1 min-w-0 text-left"
                              >
                                <p className="text-foreground font-semibold text-sm">{cat.name}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-muted-foreground">{cat.count} item{cat.count !== 1 ? "s" : ""}</span>
                                  {cat.urgent > 0 && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">{cat.urgent} urgent</span>}
                                  {cat.overdue > 0 && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">{cat.overdue} overdue</span>}
                                </div>
                              </button>
                              <button
                                onClick={() => { setEditingCat(cat); setShowEditor(true); }}
                                className="shrink-0 p-2 active:scale-90 transition-transform"
                              >
                                <Edit3 className="w-4 h-4 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => deleteCategory(cat)}
                                className="shrink-0 p-2 active:scale-90 transition-transform"
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-rose-500" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      {showEditor && (
        <CategoryEditor
          category={editingCat}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); invalidate(); }}
        />
      )}
    </Layout>
  );
}

function CategoryEditor({ category, onClose, onSaved }) {
  const [name, setName] = useState(category?.name || "");
  const [icon, setIcon] = useState(category?.icon || "FileText");
  const [color, setColor] = useState(category?.color || "slate");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (category) {
        await db.entities.Category.update(category.id, { name: name.trim(), icon, color });
        toast({ title: "Category updated", variant: "success" });
      } else {
        await db.entities.Category.create({ name: name.trim(), icon, color, sort_order: 99, favourite: false });
        toast({ title: "Category added", variant: "success" });
      }
      onSaved();
    } catch (e) {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end justify-center animate-fade-in" onClick={onClose}>
      <div className="glass-frost rounded-t-3xl p-6 w-full max-w-md animate-slide-up max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold text-lg">{category ? "Edit Category" : "New Category"}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full glass-frost flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex items-center justify-center mb-5">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", getColorClass(color))}>
            {(() => { const Ic = getIconComponent(icon); return <Ic className="w-7 h-7 text-white" />; })()}
          </div>
        </div>

        {/* Name */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1.5">Name</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Business License"
            className="w-full bg-white/60 dark:bg-white/10 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-[#FF8C42] transition-colors"
          />
        </div>

        {/* Icon picker */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Icon</p>
          <div className="grid grid-cols-6 gap-2">
            {ICON_NAMES.map((iconName) => {
              const Icon = getIconComponent(iconName);
              return (
                <button
                  key={iconName}
                  onClick={() => setIcon(iconName)}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center transition-all active:scale-90",
                    icon === iconName ? "accent-gradient" : "glass-frost"
                  )}
                >
                  <Icon className={cn("w-5 h-5", icon === iconName ? "text-white" : "text-muted-foreground")} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Color picker */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-2">Color</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_NAMES.map((colorName) => (
              <button
                key={colorName}
                onClick={() => setColor(colorName)}
                className={cn(
                  "w-9 h-9 rounded-full transition-all active:scale-90",
                  COLOR_MAP[colorName],
                  color === colorName && "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                )}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full accent-gradient text-white rounded-full py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {saving ? "Saving..." : category ? "Save Changes" : "Add Category"}
        </button>
      </div>
    </div>
  );
}