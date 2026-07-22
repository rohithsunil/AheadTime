import React from "react";
import { FileText, Repeat, Ticket } from "lucide-react";
import { getIconComponent, getColorClass } from "@/lib/categoryUtils";
import { cn } from "@/lib/utils";

// Module-level image cache — ensures images load instantly on repeat renders.
// Once an image URL is preloaded, subsequent renders show it immediately from
// the browser's memory cache.
const imageCache = new Set();

export function preloadImage(url) {
  if (!url || imageCache.has(url)) return;
  imageCache.add(url);
  const img = new Image();
  img.loading = "eager";
  img.decoding = "async";
  img.src = url;
}

export function preloadImages(urls) {
  (urls || []).filter(Boolean).forEach(preloadImage);
}

// Shared custom icon renderer — handles custom_image_url, custom_icon,
// category icon, and type-based fallback. Eager-loads images for instant display.
export default function CustomIcon({
  item,
  categories = [],
  sizeClass = "w-10 h-10",
  iconSize = "w-5 h-5",
  rounded = "rounded-xl",
  colorOverride,
  iconClassName,
}) {
  const catMatch = categories.find((c) => c.name === item.category);
  const hasCustomImage = !!item.custom_image_url;
  const FallbackIcon = item.custom_icon
    ? getIconComponent(item.custom_icon)
    : catMatch
    ? getIconComponent(catMatch.icon)
    : item._type === "subscription"
    ? Repeat
    : item._type === "voucher"
    ? Ticket
    : FileText;
  const colorClass = colorOverride || (catMatch ? getColorClass(catMatch.color) : "bg-slate-500");

  // Preload the image as soon as the component mounts so it's in memory cache
  React.useEffect(() => {
    if (hasCustomImage) preloadImage(item.custom_image_url);
  }, [hasCustomImage, item.custom_image_url]);

  return (
    <div className={cn("flex items-center justify-center shrink-0 overflow-hidden", colorClass, sizeClass, rounded)}>
      {hasCustomImage ? (
        <img
          src={item.custom_image_url}
          alt=""
          loading="eager"
          decoding="async"
          fetchpriority="high"
          className="w-full h-full object-cover"
        />
      ) : (
        <FallbackIcon className={cn("text-white", iconSize, iconClassName)} />
      )}
    </div>
  );
}