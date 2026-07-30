import { useCallback, useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";

interface ScreenshotViewerProps {
  src: string | null;
  onClose: () => void;
  alt?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.5;

function clampZoom(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/**
 * Full-screen payment-screenshot viewer with view-only 90° rotation and
 * zoom (buttons + scroll wheel) with drag-to-pan while zoomed in.
 *
 * Built on Radix dialog primitives so that, when stacked above another
 * modal (e.g. the order-details dialog), Escape, outside-interaction and
 * keyboard focus are all scoped to the top-most layer: focus is trapped in
 * the viewer while it is open and restored when it closes, so keyboard
 * input can never reach controls underneath the overlay.
 *
 * Rotation and zoom are pure CSS transforms — the stored file is never
 * modified and every newly opened screenshot starts upright at 100%.
 * Panning is applied on a wrapper element (screen-space translate) so the
 * drag direction always matches the pointer regardless of rotation.
 */
export default function ScreenshotViewer({ src, onClose, alt = "Payment screenshot" }: ScreenshotViewerProps) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const rotateButtonRef = useRef<HTMLButtonElement>(null);
  const dragStart = useRef<{ pointerId: number; startX: number; startY: number; panX: number; panY: number } | null>(null);

  // Every newly opened screenshot starts upright, unzoomed and centered.
  useEffect(() => {
    setRotation(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [src]);

  const applyZoom = useCallback((next: number) => {
    const clamped = clampZoom(next);
    setZoom(clamped);
    // Fully zoomed out — recenter, nothing to pan any more.
    if (clamped === MIN_ZOOM) setPan({ x: 0, y: 0 });
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      applyZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    },
    [zoom, applyZoom]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (zoom <= MIN_ZOOM) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragStart.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      setDragging(true);
    },
    [zoom, pan]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragStart.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setPan({ x: d.panX + (e.clientX - d.startX), y: d.panY + (e.clientY - d.startY) });
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current?.pointerId !== e.pointerId) return;
    dragStart.current = null;
    setDragging(false);
  }, []);

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
              <div className="flex items-center gap-4">
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
                  className="text-white/80 hover:text-white disabled:text-white/30 text-sm flex items-center gap-1.5"
                  onClick={() => applyZoom(zoom + ZOOM_STEP)}
                  disabled={zoom >= MAX_ZOOM}
                  data-testid="button-zoom-in-screenshot"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-5 h-5" /> Zoom in
                </button>
                <button
                  type="button"
                  className="text-white/80 hover:text-white disabled:text-white/30 text-sm flex items-center gap-1.5"
                  onClick={() => applyZoom(zoom - ZOOM_STEP)}
                  disabled={zoom <= MIN_ZOOM}
                  data-testid="button-zoom-out-screenshot"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-5 h-5" /> Zoom out
                </button>
                <span className="text-white/60 text-sm tabular-nums" data-testid="text-zoom-level">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
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
            <div
              className="w-full h-[80vh] flex items-center justify-center overflow-hidden touch-none"
              data-testid="screenshot-pan-area"
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{ cursor: zoom > MIN_ZOOM ? (dragging ? "grabbing" : "grab") : undefined }}
            >
              {/* Pan wrapper: screen-space translate so drag matches the pointer at any rotation. */}
              <div
                data-testid="screenshot-pan-wrapper"
                data-pan-x={Math.round(pan.x)}
                data-pan-y={Math.round(pan.y)}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
              >
                <img
                  src={src}
                  alt={alt}
                  draggable={false}
                  data-testid="img-screenshot-preview"
                  data-rotation={((rotation % 360) + 360) % 360}
                  data-zoom={zoom}
                  className={`rounded-xl shadow-2xl select-none ${dragging ? "" : "transition-transform duration-300"}`}
                  style={{
                    transform: `rotate(${rotation}deg) scale(${zoom})`,
                    maxWidth: sideways ? "80vh" : "100%",
                    maxHeight: sideways ? "min(48rem, calc(100vw - 2rem))" : "80vh",
                  }}
                />
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
