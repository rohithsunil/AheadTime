import React from "react";
import { X, Download, ExternalLink } from "lucide-react";

export default function ImageViewer({ url, name, onClose }) {
  const isImage = url && /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/i.test(url) ||
    (url && !url.toLowerCase().includes(".pdf"));

  const handleDownload = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name || "attachment";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/80 flex flex-col animate-fade-in"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white/80 text-sm truncate max-w-[60vw]">{name || "Attachment"}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center active:scale-90 transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4 text-white" />
          </a>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center active:scale-90 transition-transform"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center p-4 overflow-auto"
        onClick={onClose}
      >
        {isImage ? (
          <img
            src={url}
            alt={name}
            className="max-w-full max-h-full object-contain rounded-xl select-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <iframe
            src={url}
            title={name}
            className="w-full h-full rounded-xl bg-white"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
}