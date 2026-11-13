import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { SRC_H, SRC_W } from "../constants";
import {
  centeredCoverTransform,
  clampCropTransform,
  coverScale,
  renderCropToSplash,
  type CropTransform,
} from "../lib/fitImage";

interface ImageCropEditorProps {
  bitmap: ImageBitmap;
  disabled?: boolean;
  onApply: (cropped: ImageBitmap) => void | Promise<void>;
}

function paintPreview(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  transform: CropTransform,
): void {
  const wrap = canvas.parentElement;
  if (!wrap) return;
  const { width, height } = wrap.getBoundingClientRect();
  const cssW = Math.max(1, Math.round(width));
  const cssH = Math.max(1, Math.round(height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const tile = 12;
  ctx.fillStyle = "#0c0e12";
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#151820";
  for (let y = 0; y < cssH; y += tile) {
    for (let x = 0; x < cssW; x += tile) {
      if ((x / tile + y / tile) % 2 === 0) {
        ctx.fillRect(x, y, tile, tile);
      }
    }
  }

  const viewScale = cssW / SRC_W;
  const clamped = clampCropTransform(bitmap.width, bitmap.height, transform);
  const scale = coverScale(bitmap.width, bitmap.height) * clamped.zoom * viewScale;
  const drawW = bitmap.width * scale;
  const drawH = bitmap.height * scale;
  const dx = clamped.offsetX * viewScale;
  const dy = clamped.offsetY * viewScale;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, dx, dy, drawW, drawH);
}

function zoomAroundCenter(
  bitmap: ImageBitmap,
  current: CropTransform,
  zoom: number,
): CropTransform {
  const scaleBefore = coverScale(bitmap.width, bitmap.height) * current.zoom;
  const cx = SRC_W / 2;
  const cy = SRC_H / 2;
  const focusX = (cx - current.offsetX) / scaleBefore;
  const focusY = (cy - current.offsetY) / scaleBefore;
  const nextZoom = Math.min(4, Math.max(1, zoom));
  const scaleAfter = coverScale(bitmap.width, bitmap.height) * nextZoom;
  return clampCropTransform(bitmap.width, bitmap.height, {
    zoom: nextZoom,
    offsetX: cx - focusX * scaleAfter,
    offsetY: cy - focusY * scaleAfter,
  });
}

export function ImageCropEditor({ bitmap, disabled = false, onApply }: ImageCropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: CropTransform;
  } | null>(null);

  const [transform, setTransform] = useState(() =>
    centeredCoverTransform(bitmap.width, bitmap.height),
  );
  const [applying, setApplying] = useState(false);

  const setZoom = useCallback(
    (zoom: number) => {
      setTransform((current) => zoomAroundCenter(bitmap, current, zoom));
    },
    [bitmap],
  );

  const nudgeZoom = useCallback(
    (delta: number) => {
      setTransform((current) => zoomAroundCenter(bitmap, current, current.zoom + delta));
    },
    [bitmap],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let frame = 0;
    const redraw = () => {
      paintPreview(canvas, bitmap, transform);
    };

    redraw();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(redraw);
    });
    observer.observe(wrap);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [bitmap, transform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onNativeWheel = (event: WheelEvent) => {
      if (disabled || applying) return;
      event.preventDefault();
      nudgeZoom(event.deltaY > 0 ? -0.08 : 0.08);
    };
    canvas.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onNativeWheel);
    };
  }, [applying, disabled, nudgeZoom]);

  const reset = useCallback(() => {
    setTransform(centeredCoverTransform(bitmap.width, bitmap.height));
  }, [bitmap]);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || applying) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: transform,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const { width } = wrap.getBoundingClientRect();
    const viewScale = Math.max(1, width) / SRC_W;
    const dx = (event.clientX - drag.startX) / viewScale;
    const dy = (event.clientY - drag.startY) / viewScale;
    setTransform(
      clampCropTransform(bitmap.width, bitmap.height, {
        zoom: drag.origin.zoom,
        offsetX: drag.origin.offsetX + dx,
        offsetY: drag.origin.offsetY + dy,
      }),
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const apply = async () => {
    if (disabled || applying) return;
    try {
      setApplying(true);
      const cropped = await renderCropToSplash(bitmap, transform);
      await onApply(cropped);
    } finally {
      setApplying(false);
    }
  };

  const busy = disabled || applying;

  return (
    <div className="crop-editor">
      <p className="preview-label">Adjust crop · drag to move · scroll or slider to zoom</p>
      <div className="preview-wrap crop-stage" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className={`crop-canvas${busy ? " disabled" : ""}`}
          aria-label="Crop preview"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      </div>
      <div className="crop-toolbar">
        <label className="crop-zoom">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={transform.zoom}
            disabled={busy}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
          <span className="crop-zoom-value">{transform.zoom.toFixed(2)}×</span>
        </label>
        <button
          type="button"
          className="ghost icon-btn"
          disabled={busy}
          onClick={reset}
          title="Reset to initial fit (cover + centered)"
          aria-label="Reset crop to initial fit"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6a6 6 0 0 1-9.9 4.5l-1.42 1.42A8 8 0 0 0 20 13c0-4.42-3.58-8-8-8zm-6.58.08L4 6.5A8 8 0 0 0 4 13c0 1.85.63 3.55 1.68 4.9l1.42-1.42A6 6 0 0 1 6 13c0-2.45 1.47-4.55 3.58-5.5L7.42 5.08z"
            />
          </svg>
        </button>
        <button type="button" disabled={busy} onClick={() => void apply()}>
          {applying ? "Applying…" : `Apply crop (${SRC_W}×${SRC_H})`}
        </button>
      </div>
    </div>
  );
}
