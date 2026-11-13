import { ROT_H, ROT_W, SPLASH_END, SPLASH_OFFSET, SRC_H, SRC_W, STRIDE } from "../constants";

/** Decode the official splash slot back to a 1280×720 canvas. */
export function decodeSplashCanvas(bytes: Uint8Array): HTMLCanvasElement {
  const splash = bytes.subarray(SPLASH_OFFSET, SPLASH_END);
  const rotated = document.createElement("canvas");
  rotated.width = ROT_W;
  rotated.height = ROT_H;
  const rctx = rotated.getContext("2d");
  if (!rctx) {
    throw new Error("Could not create canvas context");
  }

  const imageData = rctx.createImageData(ROT_W, ROT_H);
  const rowBytes = STRIDE * 4;

  for (let row = 0; row < SRC_W; row += 1) {
    for (let col = 0; col < SRC_H; col += 1) {
      const src = row * rowBytes + col * 4;
      const dst = (row * ROT_W + col) * 4;
      imageData.data[dst] = splash[src + 2];
      imageData.data[dst + 1] = splash[src + 1];
      imageData.data[dst + 2] = splash[src];
      imageData.data[dst + 3] = splash[src + 3];
    }
  }
  rctx.putImageData(imageData, 0, 0);

  const out = document.createElement("canvas");
  out.width = SRC_W;
  out.height = SRC_H;
  const octx = out.getContext("2d");
  if (!octx) {
    throw new Error("Could not create canvas context");
  }
  octx.translate(SRC_W, 0);
  octx.rotate(Math.PI / 2);
  octx.drawImage(rotated, 0, 0);
  return out;
}
