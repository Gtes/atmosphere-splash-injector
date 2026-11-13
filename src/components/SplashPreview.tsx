import { useEffect, useRef } from "react";
import { clearCanvas, drawOnto, drawPlaceholder } from "../lib/previewCanvas";

export type PreviewSource =
  | { kind: "empty" }
  | { kind: "placeholder"; text: string }
  | { kind: "bitmap"; bitmap: ImageBitmap }
  | { kind: "canvas"; canvas: HTMLCanvasElement };

interface SplashPreviewProps {
  label: string;
  source: PreviewSource;
  canvasLabel: string;
}

function paint(canvas: HTMLCanvasElement, source: PreviewSource): void {
  if (source.kind === "empty") {
    clearCanvas(canvas);
    return;
  }
  if (source.kind === "placeholder") {
    drawPlaceholder(canvas, source.text);
    return;
  }
  if (source.kind === "bitmap") {
    drawOnto(canvas, source.bitmap);
    return;
  }
  drawOnto(canvas, source.canvas);
}

export function SplashPreview({ label, source, canvasLabel }: SplashPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let frame = 0;
    let lastWidth = -1;
    let lastHeight = -1;

    const redraw = () => {
      const { width, height } = wrap.getBoundingClientRect();
      const nextWidth = Math.round(width);
      const nextHeight = Math.round(height);
      // Always paint once; afterward only when the layout box changes.
      if (nextWidth === lastWidth && nextHeight === lastHeight && lastWidth !== -1) {
        return;
      }
      lastWidth = nextWidth;
      lastHeight = nextHeight;
      paint(canvas, source);
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
  }, [source]);

  return (
    <>
      <p className="preview-label">{label}</p>
      <div className="preview-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} aria-label={canvasLabel} />
      </div>
    </>
  );
}
