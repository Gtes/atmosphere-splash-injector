function sizePreviewCanvas(canvas: HTMLCanvasElement): {
  width: number;
  height: number;
  dpr: number;
} {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round((rect.width || 320) * dpr));
  const height = Math.max(1, Math.round((rect.height || 180) * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height, dpr };
}

export function clearCanvas(canvas: HTMLCanvasElement): void {
  sizePreviewCanvas(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0c0e12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawOnto(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource & { width: number; height: number },
): void {
  const { width, height } = sizePreviewCanvas(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0c0e12";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const scale = Math.min(width / source.width, height / source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, (width - w) / 2, (height - h) / 2, w, h);
}

export function drawPlaceholder(canvas: HTMLCanvasElement, text: string): void {
  clearCanvas(canvas);
  const { dpr } = sizePreviewCanvas(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#9aa1b0";
  ctx.font = `${Math.round(12 * dpr)}px IBM Plex Sans, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}
