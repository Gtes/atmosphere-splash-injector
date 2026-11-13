import { SRC_H, SRC_W } from "../constants";

/** Center-crop (cover) an image into a 1280×720 ImageBitmap. */
export async function fitImageToSplash(source: ImageBitmap): Promise<ImageBitmap> {
  const canvas = document.createElement("canvas");
  canvas.width = SRC_W;
  canvas.height = SRC_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  const scale = Math.max(SRC_W / source.width, SRC_H / source.height);
  const drawW = source.width * scale;
  const drawH = source.height * scale;
  const dx = (SRC_W - drawW) / 2;
  const dy = (SRC_H - drawH) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, dx, dy, drawW, drawH);

  return createImageBitmap(canvas);
}
