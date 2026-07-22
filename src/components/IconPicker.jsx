import { db } from '@/api/db';

import React, { useState } from "react";
import { Upload, Image as ImageIcon, RotateCcw } from "lucide-react";
import { ICON_NAMES, getIconComponent } from "@/lib/categoryUtils";

import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { toast } from "@/components/ui/use-toast";

// Icon picker — lets users choose a custom icon or upload a square image.
// Falls back to category icon when neither is set.
export default function IconPicker({ customIcon, customImageUrl, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    haptic(8);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      onChange({ custom_icon: "", custom_image_url: file_url });
      toast({ title: "Image uploaded", variant: "success" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
  };

  const hasCustom = customIcon || customImageUrl;

  return (
    <div className="glass-frost rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-slate-500">
          {customImageUrl ? (
            <img src={customImageUrl} alt="" className="w-full h-full object-cover" />
          ) : customIcon ? (
            React.createElement(getIconComponent(customIcon), { className: "w-6 h-6 text-white" })
          ) : (
            <ImageIcon className="w-6 h-6 text-white/60" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-foreground text-sm font-medium">Custom Icon</p>
          <p className="text-muted-foreground text-xs">{hasCustom ? "Custom icon set" : "Uses category icon by default"}</p>
        </div>
        {hasCustom && (
          <button
            onClick={() => { haptic(8); onChange({ custom_icon: "", custom_image_url: "" }); }}
            className="flex items-center gap-1 text-xs text-rose-500 font-medium px-2 py-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      <label className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border cursor-pointer hover:border-[#FF8C42] transition-colors mb-3">
        {uploading ? (
          <div className="w-4 h-4 border-2 border-border border-t-[#FF8C42] rounded-full animate-spin" />
        ) : (
          <Upload className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Upload square image"}</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </label>

      <button
        onClick={() => { haptic(6); setExpanded(!expanded); }}
        className="w-full text-left text-xs text-[#FF8C42] dark:text-orange-400 font-medium"
      >
        {expanded ? "Hide icon library" : "Or pick from icon library"}
      </button>

      {expanded && (
        <div className="grid grid-cols-6 gap-2 mt-3 animate-fade-in">
          {ICON_NAMES.map((name) => {
            const Icon = getIconComponent(name);
            const isActive = customIcon === name;
            return (
              <button
                key={name}
                onClick={() => { haptic(6); onChange({ custom_icon: name, custom_image_url: "" }); }}
                className={cn(
                  "aspect-square rounded-xl flex items-center justify-center transition-all active:scale-90",
                  isActive ? "accent-gradient" : "bg-foreground/5 hover:bg-foreground/10"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-foreground/70")} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}