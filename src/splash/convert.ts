import {
  ROT_H,
  ROT_W,
  SPLASH_SIZE,
  SRC_H,
  SRC_W,
  STRIDE,
} from "../constants";

/** Convert a 1280×720 (or already 720×1280) image to the official splash blob. */
export function convertImageToSplash(bitmap: ImageBitmap): Uint8Array {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  // Pillow Image.ROTATE_90 = 90° counter-clockwise.
  canvas.width = ROT_W;
  canvas.height = ROT_H;
  if (bitmap.width === SRC_W && bitmap.height === SRC_H) {
    ctx.translate(0, ROT_H);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(bitmap, 0, 0);
  } else {
    ctx.drawImage(bitmap, 0, 0);
  }

  const { data } = ctx.getImageData(0, 0, ROT_W, ROT_H);
  const out = new Uint8Array(SPLASH_SIZE);
  const rowBytes = STRIDE * 4;
  const visible = ROT_W * 4;
  let o = 0;

  for (let row = 0; row < SRC_W; row += 1) {
    for (let col = 0; col < SRC_H; col += 1) {
      const i = (row * ROT_W + col) * 4;
      out[o++] = data[i + 2];
      out[o++] = data[i + 1];
      out[o++] = data[i];
      out[o++] = data[i + 3];
    }
    o += rowBytes - visible;
  }

  if (o !== SPLASH_SIZE) {
    throw new Error(`Internal size error: wrote ${o}, expected ${SPLASH_SIZE}`);
  }
  return out;
}
