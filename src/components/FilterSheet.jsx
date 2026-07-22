import React from "react";
import { X, SlidersHorizontal, Archive, Tag, LayoutGrid } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { getIconComponent } from "@/lib/categoryUtils";
import { cn } from "@/lib/utils";

const URGENCY_FILTERS = ["All", "Overdue", "Urgent", "Soon", "Safe"];
const SORT_OPTIONS = [
  { value: "expiry", label: "Nearest expiry" },
  { value: "recent", label: "Recently added" },
  { value: "alpha", label: "Alphabetical" },
];

export default function FilterSheet({
  category, setCategory,
  urgency, setUrgency,
  selectedTag, setSelectedTag,
  showArchived, setShowArchived,
  sortBy, setSortBy,
  categories, allTags,
  onReorder, onClose,
}) {
  const activeCount =
    (category !== "All" ? 1 : 0) +
    (urgency !== "All" ? 1 : 0) +
    (selectedTag ? 1 : 0) +
    (showArchived ? 1 : 0);

  const clearAll = () => {
    setCategory("All");
    setUrgency("All");
    setSelectedTag("");
    setShowArchived(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end animate-fade-in" onClick={onClose}>
      <div className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-3xl mx-auto max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-foreground/15 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#FF8C42]" />
            <h3 className="text-foreground font-semibold text-base">Filters</h3>
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full accent-gradient text-white text-[10px] font-bold flex items-center justify-center">{activeCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-muted-foreground text-xs font-medium">Clear all</button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Sort */}
        <div className="mb-5">
          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide mb-2">Sort by</p>
          <div className="flex gap-2 flex-wrap">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  sortBy === opt.value ? "accent-gradient text-white" : "bg-foreground/5 text-muted-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="mb-5">
          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide mb-2">Category</p>
          <DragDropContext onDragEnd={onReorder}>
            <Droppable droppableId="filter-category" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex gap-2 flex-wrap"
                >
                  <button
                    onClick={() => setCategory("All")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
                      category === "All" ? "accent-gradient text-white" : "bg-foreground/5 text-muted-foreground"
                    )}
                  >
                    <LayoutGrid className="w-3 h-3" />
                    All
                  </button>
                  {categories.map((cat, index) => {
                    const CatIcon = getIconComponent(cat.icon);
                    return (
                      <Draggable key={cat.id} draggableId={cat.id} index={index}>
                        {(prov) => (
                          <button
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            onClick={() => setCategory(cat.name)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
                              category === cat.name ? "accent-gradient text-white" : "bg-foreground/5 text-muted-foreground"
                            )}
                          >
                            <CatIcon className="w-3 h-3" />
                            {cat.name}
                          </button>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Status */}
        <div className="mb-5">
          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide mb-2">Status</p>
          <div className="flex gap-2 flex-wrap">
            {URGENCY_FILTERS.map((u) => (
              <button
                key={u}
                onClick={() => setUrgency(u)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  urgency === u ? "bg-foreground text-background" : "bg-foreground/5 text-muted-foreground"
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="mb-5">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide mb-2">Tags</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedTag("")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  !selectedTag ? "bg-foreground text-background" : "bg-foreground/5 text-muted-foreground"
                )}
              >
                All tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
                    selectedTag === tag ? "bg-foreground text-background" : "bg-foreground/5 text-muted-foreground"
                  )}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Archived */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
            showArchived ? "bg-foreground text-background" : "bg-foreground/5 text-muted-foreground"
          )}
        >
          <Archive className="w-4 h-4" />
          {showArchived ? "Showing archived" : "Show archived"}
        </button>
      </div>
    </div>
  );
}