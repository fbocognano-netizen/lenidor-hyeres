import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type LightboxPhoto = { url: string; alt: string };

type Props = {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
};

export function Lightbox({ photos, index, onClose, onIndexChange }: Props) {
  const open = index !== null && index >= 0 && index < photos.length;
  const current = open ? photos[index] : null;
  const total = photos.length;

  const goPrev = useCallback(() => {
    if (index === null || total === 0) return;
    onIndexChange((index - 1 + total) % total);
  }, [index, onIndexChange, total]);

  const goNext = useCallback(() => {
    if (index === null || total === 0) return;
    onIndexChange((index + 1) % total);
  }, [index, onIndexChange, total]);

  // Keyboard nav + scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, goPrev, goNext]);

  // Preload neighbours
  useEffect(() => {
    if (!open || index === null) return;
    const preload = (i: number) => {
      const p = photos[(i + total) % total];
      if (!p) return;
      const img = new Image();
      img.src = p.url;
    };
    preload(index + 1);
    preload(index - 1);
  }, [open, index, photos, total]);

  // Swipe
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (startX.current === null || startY.current === null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    startX.current = null;
    startY.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) goPrev();
      else goNext();
    }
  };

  const captionKey = useMemo(() => (current ? current.url : ""), [current]);

  if (!open || !current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-deep/95 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Galerie photo plein écran"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 text-white/90">
        <span className="text-sm tracking-wide tabular-nums">
          {index! + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la galerie"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main stage */}
      <div
        className="relative flex-1 flex items-center justify-center px-2 sm:px-6 select-none touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={(e) => {
          // click on empty area (not on img/button) closes
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          key={captionKey}
          src={current.url}
          alt={current.alt}
          className="max-h-full max-w-full object-contain rounded-lg animate-scale-in"
          draggable={false}
        />

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Photo précédente"
              className={cn(
                "absolute left-2 sm:left-6 top-1/2 -translate-y-1/2",
                "grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-full",
                "bg-white/15 hover:bg-white/30 text-white transition",
              )}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Photo suivante"
              className={cn(
                "absolute right-2 sm:right-6 top-1/2 -translate-y-1/2",
                "grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-full",
                "bg-white/15 hover:bg-white/30 text-white transition",
              )}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Caption */}
      <div className="px-6 pb-3 text-center text-sm text-white/70">{current.alt}</div>

      {/* Thumbnails */}
      {total > 1 && (
        <div className="pb-4 sm:pb-6 px-2 sm:px-4">
          <div className="mx-auto flex max-w-full gap-2 overflow-x-auto scrollbar-none justify-start sm:justify-center">
            {photos.map((p, i) => (
              <button
                key={p.url}
                type="button"
                onClick={() => onIndexChange(i)}
                aria-label={`Voir ${p.alt}`}
                className={cn(
                  "shrink-0 overflow-hidden rounded-md transition ring-2",
                  i === index ? "ring-white" : "ring-transparent opacity-60 hover:opacity-100",
                )}
              >
                <img src={p.url} alt="" className="h-14 w-20 sm:h-16 sm:w-24 object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function useLightbox() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return {
    openIndex,
    open: (i: number) => setOpenIndex(i),
    close: () => setOpenIndex(null),
    setIndex: (i: number) => setOpenIndex(i),
  };
}
