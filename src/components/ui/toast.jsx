import * as React from "react";
import { cn } from "@/lib/utils";

// Minimal provider/viewport kept for backward compatibility — the bubble
// Toaster renders its own fixed container.
const ToastProvider = React.forwardRef(({ ...props }, ref) => (
  <div ref={ref} {...props} />
));
ToastProvider.displayName = "ToastProvider";

const ToastViewport = React.forwardRef(({ ...props }, ref) => (
  <div ref={ref} {...props} />
));
ToastViewport.displayName = "ToastViewport";

const variantStyles = {
  default: "glass-frost text-foreground",
  success: "glass-frost text-foreground",
  destructive: "bg-rose-500/95 text-white border border-rose-400/40",
};

const Toast = React.forwardRef(
  ({ className, variant = "default", open = true, onOpenChange, children, ...props }, ref) => {
    const [dragX, setDragX] = React.useState(0);
    const [dragging, setDragging] = React.useState(false);
    const startX = React.useRef(null);

    const handleTouchStart = (e) => {
      startX.current = e.touches[0].clientX;
      setDragging(true);
    };

    const handleTouchMove = (e) => {
      if (!dragging || startX.current == null) return;
      setDragX(e.touches[0].clientX - startX.current);
    };

    const handleTouchEnd = () => {
      if (Math.abs(dragX) > 70) {
        onOpenChange?.(false);
      }
      setDragging(false);
      setDragX(0);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-lg max-w-full select-none",
          open ? "animate-toast-in" : "animate-toast-out",
          variantStyles[variant] || variantStyles.default,
          className
        )}
        style={{
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: dragging ? "none" : "transform 0.25s ease",
          touchAction: "pan-y",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Toast.displayName = "Toast";

const ToastClose = () => null;
const ToastAction = () => null;

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
));
ToastDescription.displayName = "ToastDescription";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastClose,
  ToastTitle,
  ToastDescription,
  ToastAction,
};