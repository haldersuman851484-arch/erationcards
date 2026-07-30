import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { RotateCw, X } from "lucide-react";

interface ScreenshotViewerProps {
  src: string | null;
  onClose: () => void;
  alt?: string;
}

/**
 * Full-screen payment-screenshot viewer with view-only 90° rotation.
 *
 * Built on Radix dialog primitives so that, when stacked above another
 * modal (e.g. the order-details dialog), Escape, outside-interaction and
 * keyboard focus are all scoped to the top-most layer: focus is trapped in
 * the viewer while it is open and restored when it closes, so keyboard
 * input can never reach controls underneath the overlay.
 *
 * Rotation is a pure CSS transform — the stored file is never modified and
 * every newly opened screenshot starts upright.
 */
export default function ScreenshotViewer({ src, onClose, alt = "Payment screenshot" }: ScreenshotViewerProps) {
  const [rotation, setRotation] = useState(0);
  const rotateButtonRef = useRef<HTMLButtonElement>(null);

  // Every newly opened screenshot starts upright.
  useEffect(() => {
    setRotation(0);
  }, [src]);

  if (!src) return null;

  // While rotated sideways the element's width becomes the visual height
  // and vice versa, so the pre-transform constraints are swapped to keep
  // the whole image on screen at any rotation.
  const sideways = rotation % 180 !== 0;

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[100] flex items-center justify-center outline-none"
          onClick={onClose}
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            rotateButtonRef.current?.focus();
          }}
        >
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          <div className="relative max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-10 inset-x-0 flex items-center justify-between">
              <button
                type="button"
                ref={rotateButtonRef}
                className="text-white/80 hover:text-white text-sm flex items-center gap-1.5"
                onClick={() => setRotation((r) => r + 90)}
                data-testid="button-rotate-screenshot"
                aria-label="Rotate screenshot 90 degrees"
              >
                <RotateCw className="w-5 h-5" /> Rotate
              </button>
              <button
                type="button"
                className="text-white/80 hover:text-white text-sm flex items-center gap-1"
                onClick={onClose}
                data-testid="button-close-screenshot"
                aria-label="Close screenshot viewer"
              >
                <X className="w-5 h-5" /> Close
              </button>
            </div>
            <div className="w-full h-[80vh] flex items-center justify-center">
              <img
                src={src}
                alt={alt}
                data-testid="img-screenshot-preview"
                data-rotation={((rotation % 360) + 360) % 360}
                className="rounded-xl shadow-2xl transition-transform duration-300"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  maxWidth: sideways ? "80vh" : "100%",
                  maxHeight: sideways ? "min(48rem, calc(100vw - 2rem))" : "80vh",
                }}
              />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
