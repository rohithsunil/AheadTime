import { useToast } from "@/components/ui/use-toast";
import { Toast } from "@/components/ui/toast";
import { Check, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(({ id, title, description, variant, open, onOpenChange }) => {
        const Icon = variant === "success" ? Check : variant === "destructive" ? AlertCircle : Info;
        return (
          <Toast key={id} variant={variant || "default"} open={open} onOpenChange={onOpenChange}>
            <Icon
              className={cn(
                "w-4 h-4 shrink-0",
                variant === "destructive" ? "text-white" : "text-[#FF8C42]"
              )}
            />
            <div className="flex-1 min-w-0">
              {title && <p className="text-sm font-semibold leading-tight">{title}</p>}
              {description && (
                <p className="text-xs opacity-80 leading-tight mt-0.5">{description}</p>
              )}
            </div>
          </Toast>
        );
      })}
    </div>
  );
}