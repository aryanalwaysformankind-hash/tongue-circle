import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface PhotoLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  photos: string[];
  startIndex?: number;
}

export default function PhotoLightbox({ open, onOpenChange, name, photos, startIndex = 0 }: PhotoLightboxProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const total = photos.length;

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  const go = (step: number) => setIndex((current) => (current + step + total) % total);

  if (total === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onKeyDown={(event) => {
          if (total < 2) return;
          if (event.key === "ArrowRight") { event.preventDefault(); go(1); }
          if (event.key === "ArrowLeft") { event.preventDefault(); go(-1); }
        }}
        className="max-w-[min(96vw,1000px)] gap-0 overflow-hidden rounded-3xl border-0 bg-[#121317] p-0 text-white sm:max-w-[min(96vw,1000px)]"
        data-testid="photo-lightbox"
      >
        <DialogTitle className="sr-only">{name}'s photos</DialogTitle>
        <div
          className="relative flex h-[min(80vh,720px)] items-center justify-center bg-black"
          onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const delta = event.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          <img
            key={index}
            src={photos[index]}
            alt={`${name} photo ${index + 1}`}
            className="animate-rise max-h-full max-w-full select-none object-contain"
            draggable={false}
            data-testid="photo-lightbox-image"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            data-testid="photo-lightbox-close"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-colors hover:bg-white/30"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Close photos</span>
          </button>
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                data-testid="photo-lightbox-prev"
                className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-colors hover:bg-white/30"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
                <span className="sr-only">Previous photo</span>
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                data-testid="photo-lightbox-next"
                className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-colors hover:bg-white/30"
              >
                <ChevronRight className="size-6" aria-hidden="true" />
                <span className="sr-only">Next photo</span>
              </button>
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <p data-testid="photo-lightbox-name" className="font-heading font-bold">{name}</p>
          <div className="flex items-center gap-1.5">
            {photos.map((photo, dot) => (
              <button
                key={`${photo.slice(0, 32)}-${dot}`}
                type="button"
                onClick={() => setIndex(dot)}
                data-testid={`photo-lightbox-dot-${dot}`}
                className={`h-2 rounded-full transition-[width,background-color] duration-200 ${dot === index ? "w-6 bg-[#D9532F]" : "w-2 bg-white/35 hover:bg-white/60"}`}
              >
                <span className="sr-only">Show photo {dot + 1}</span>
              </button>
            ))}
          </div>
          <p data-testid="photo-lightbox-counter" className="text-sm text-white/65">{index + 1} / {total}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
