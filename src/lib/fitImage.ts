import { SRC_H, SRC_W } from "../constants";

export interface CropTransform {
  /** 1 = cover the frame; higher zooms in. */
  zoom: number;
  /** Top-left of the drawn image in splash pixels (1280×720 space). */
  offsetX: number;
  /** Top-left of the drawn image in splash pixels (1280×720 space). */
  offsetY: number;
}

export function coverScale(imageWidth: number, imageHeight: number): number {
  return Math.max(SRC_W / imageWidth, SRC_H / imageHeight);
}

export function centeredCoverTransform(imageWidth: number, imageHeight: number): CropTransform {
  const scale = coverScale(imageWidth, imageHeight);
  const drawW = imageWidth * scale;
  const drawH = imageHeight * scale;
  return {
    zoom: 1,
    offsetX: (SRC_W - drawW) / 2,
    offsetY: (SRC_H - drawH) / 2,
  };
}

export function clampCropTransform(
  imageWidth: number,
  imageHeight: number,
  transform: CropTransform,
): CropTransform {
  const zoom = Math.min(4, Math.max(1, transform.zoom));
  const scale = coverScale(imageWidth, imageHeight) * zoom;
  const drawW = imageWidth * scale;
  const drawH = imageHeight * scale;

  const minX = Math.min(0, SRC_W - drawW);
  const maxX = Math.max(0, SRC_W - drawW);
  const minY = Math.min(0, SRC_H - drawH);
  const maxY = Math.max(0, SRC_H - drawH);

  return {
    zoom,
    offsetX: Math.min(maxX, Math.max(minX, transform.offsetX)),
    offsetY: Math.min(maxY, Math.max(minY, transform.offsetY)),
  };
}

function drawCropped(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource & { width: number; height: number },
  transform: CropTransform,
): void {
  const clamped = clampCropTransform(source.width, source.height, transform);
  const scale = coverScale(source.width, source.height) * clamped.zoom;
  const drawW = source.width * scale;
  const drawH = source.height * scale;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, SRC_W, SRC_H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, clamped.offsetX, clamped.offsetY, drawW, drawH);
}

/** Center-crop (cover) an image into a 1280×720 ImageBitmap. */
export async function fitImageToSplash(source: ImageBitmap): Promise<ImageBitmap> {
  return renderCropToSplash(source, centeredCoverTransform(source.width, source.height));
}

/** Render an image with pan/zoom into a 1280×720 ImageBitmap. */
export async function renderCropToSplash(
  source: ImageBitmap,
  transform: CropTransform,
): Promise<ImageBitmap> {
  const canvas = document.createElement("canvas");
  canvas.width = SRC_W;
  canvas.height = SRC_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }
  drawCropped(ctx, source, transform);
  return createImageBitmap(canvas);
}
