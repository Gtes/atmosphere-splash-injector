/*
 * Atmosphere Splash Injector
 * Copyright (c) 2026 the Atmosphere Splash Injector contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2.
 * See LICENSE and NOTICE for details.
 *
 * Splash conversion/layout based on Atmosphère
 * utilities/insert_splash_screen.py (Copyright (c) Atmosphère-NX, GPLv2).
 */

const PKG_SIZE = 0x800000;
const SPLASH_OFFSET = 0x400000;
const SPLASH_END = 0x7c0000;
const SPLASH_SIZE = 0x3c0000;
const SRC_W = 1280;
const SRC_H = 720;
const ROT_W = 720;
const ROT_H = 1280;
const STRIDE = 768;

const state = {
  package3: null,
  packageName: "package3",
  imageBitmap: null,
  imageName: "",
  slotLooksSafe: false,
};

const pkgInput = document.getElementById("pkgInput");
const imgInput = document.getElementById("imgInput");
const pkgDrop = document.getElementById("pkgDrop");
const imgDrop = document.getElementById("imgDrop");
const pkgMeta = document.getElementById("pkgMeta");
const imgMeta = document.getElementById("imgMeta");
const preview = document.getElementById("preview");
const pkgPreview = document.getElementById("pkgPreview");
const statusEl = document.getElementById("status");
const injectBtn = document.getElementById("injectBtn");
const extractBtn = document.getElementById("extractBtn");

function setStatus(text, kind = "") {
  statusEl.textContent = text;
  statusEl.className = `status${kind ? ` ${kind}` : ""}`;
}

function updateButtons() {
  const ready = Boolean(state.package3 && state.imageBitmap && state.slotLooksSafe);
  injectBtn.disabled = !ready;
  extractBtn.disabled = !state.package3;
}

function wireDrop(zone, input, onFile) {
  zone.addEventListener("click", () => input.click());
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("drag");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("drag");
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  });
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) onFile(file);
  });
}

function readU32(view, offset) {
  return view.getUint32(offset, true);
}

function parseContentEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = [];
  for (let offset = 0x40; offset + 0x20 <= 0x400; offset += 0x20) {
    const pad = readU32(view, offset + 12);
    if (pad !== 0xcccccccc) break;
    const nameBytes = bytes.subarray(offset + 16, offset + 32);
    let end = nameBytes.indexOf(0);
    if (end < 0) end = nameBytes.length;
    if (end === 0) break;
    const name = new TextDecoder().decode(nameBytes.subarray(0, end));
    if (![...name].every((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) < 127)) break;
    const contentOffset = readU32(view, offset);
    const size = readU32(view, offset + 4);
    entries.push({ name, offset: contentOffset, size, end: contentOffset + size });
  }
  return entries;
}

function splashPadRows(bytes) {
  const splash = bytes.subarray(SPLASH_OFFSET, SPLASH_END);
  const rowBytes = STRIDE * 4;
  const visible = ROT_W * 4;
  const pad = (STRIDE - ROT_W) * 4;
  let good = 0;
  for (let row = 0; row < 32; row += 1) {
    const base = row * rowBytes;
    let zero = true;
    for (let i = 0; i < pad; i += 1) {
      if (splash[base + visible + i] !== 0) {
        zero = false;
        break;
      }
    }
    if (zero) good += 1;
  }
  return good;
}

function inspectPackage3(bytes, fileName) {
  if (bytes.length !== PKG_SIZE) {
    throw new Error(`Expected ${PKG_SIZE} bytes (8 MB), got ${bytes.length}`);
  }
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "PK31") {
    throw new Error("File does not start with PK31");
  }

  const entries = parseContentEntries(bytes);
  const overlaps = entries.filter((entry) => entry.end > SPLASH_OFFSET && entry.offset < SPLASH_END);
  const padRows = splashPadRows(bytes);
  const slotLooksLikeSplash = padRows >= 24;

  let message;
  let kind;
  let safe;

  if (overlaps.length && !slotLooksLikeSplash) {
    safe = false;
    kind = "err";
    message =
      `Blocked: ${overlaps.map((e) => e.name).join(", ")} overlap the official splash slot ` +
      `(0x400000–0x7C0000). This looks like a custom/modded package3, not stock Atmosphere.`;
  } else if (overlaps.length && slotLooksLikeSplash) {
    safe = true;
    kind = "warn";
    message =
      `Loaded ${fileName}. Content headers overlap the splash range, but the slot still has ` +
      `Atmosphere-style row padding. Injection will replace the splash only.`;
  } else if (!slotLooksLikeSplash) {
    safe = true;
    kind = "warn";
    message =
      `Loaded ${fileName}. Splash slot does not look like a padded splash yet. ` +
      `Injection will still write the official layout at 0x400000.`;
  } else {
    safe = true;
    kind = "ok";
    message = `Loaded ${fileName}. Official splash slot looks free for injection.`;
  }

  return { safe, kind, message, entries, overlaps, padRows };
}

function sizePreviewCanvas(canvas) {
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

function clearCanvas(canvas) {
  sizePreviewCanvas(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0c0e12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawOnto(canvas, source) {
  const { width, height } = sizePreviewCanvas(canvas);
  const ctx = canvas.getContext("2d");
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

/** Decode official splash slot back to a 1280×720 canvas. */
function decodeSplashCanvas(bytes) {
  const splash = bytes.subarray(SPLASH_OFFSET, SPLASH_END);
  const rotated = document.createElement("canvas");
  rotated.width = ROT_W;
  rotated.height = ROT_H;
  const rctx = rotated.getContext("2d");
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
  octx.translate(SRC_W, 0);
  octx.rotate(Math.PI / 2);
  octx.drawImage(rotated, 0, 0);
  return out;
}

function previewPackageSplash(bytes, looksLikeSplash) {
  clearCanvas(pkgPreview);
  if (!looksLikeSplash) {
    const { dpr } = sizePreviewCanvas(pkgPreview);
    const ctx = pkgPreview.getContext("2d");
    ctx.fillStyle = "#9aa1b0";
    ctx.font = `${Math.round(12 * dpr)}px IBM Plex Sans, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No official splash preview", pkgPreview.width / 2, pkgPreview.height / 2);
    return;
  }
  drawOnto(pkgPreview, decodeSplashCanvas(bytes));
}

async function loadPackage(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const info = inspectPackage3(bytes, file.name);
  state.package3 = bytes;
  state.packageName = file.name || "package3";
  state.slotLooksSafe = info.safe;
  pkgMeta.textContent = `${file.name} · ${bytes.length} bytes · pad-check ${info.padRows}/32`;
  previewPackageSplash(bytes, info.padRows >= 24);
  setStatus(info.message, info.kind);
  updateButtons();
}

function drawPreview(bitmap) {
  drawOnto(preview, bitmap);
}

async function loadImage(file) {
  const bitmap = await createImageBitmap(file);
  if (!(bitmap.width === SRC_W && bitmap.height === SRC_H) &&
      !(bitmap.width === ROT_W && bitmap.height === ROT_H)) {
    bitmap.close();
    throw new Error(`Image must be ${SRC_W}×${SRC_H} (or already ${ROT_W}×${ROT_H})`);
  }
  if (state.imageBitmap) state.imageBitmap.close();
  state.imageBitmap = bitmap;
  state.imageName = file.name;
  imgMeta.textContent = `${file.name} · ${bitmap.width}×${bitmap.height}`;
  drawPreview(bitmap);
  if (state.package3 && state.slotLooksSafe) {
    setStatus("Ready to inject. Processing stays in this browser.", "ok");
  } else if (!state.package3) {
    setStatus("Image loaded. Next: load a stock Atmosphere package3.", "ok");
  }
  updateButtons();
}

/** Same transform as Atmosphere utilities/insert_splash_screen.py */
function convertImageToSplash(bitmap) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // Pillow Image.ROTATE_90 = 90° counter-clockwise.
  if (bitmap.width === SRC_W && bitmap.height === SRC_H) {
    canvas.width = ROT_W;
    canvas.height = ROT_H;
    ctx.translate(0, ROT_H);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(bitmap, 0, 0);
  } else {
    canvas.width = ROT_W;
    canvas.height = ROT_H;
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
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      out[o++] = b;
      out[o++] = g;
      out[o++] = r;
      out[o++] = a;
    }
    o += rowBytes - visible;
  }

  if (o !== SPLASH_SIZE) {
    throw new Error(`Internal size error: wrote ${o}, expected ${SPLASH_SIZE}`);
  }
  return out;
}

function downloadBytes(bytes, fileName, mime = "application/octet-stream") {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function injectSplash() {
  if (!state.package3 || !state.imageBitmap || !state.slotLooksSafe) return;
  try {
    setStatus("Converting image and patching package3…");
    const splash = convertImageToSplash(state.imageBitmap);
    const patched = new Uint8Array(state.package3);
    patched.set(splash, SPLASH_OFFSET);
    state.package3 = patched;
    previewPackageSplash(patched, true);
    const outName = state.packageName.endsWith(".bak")
      ? "package3"
      : state.packageName.replace(/(\.bin)?$/i, "") || "package3";
    downloadBytes(patched, outName.includes("package3") ? outName : "package3");
    setStatus("Download started. Copy the file to atmosphere/package3 on the SD card.", "ok");
  } catch (error) {
    setStatus(error.message || String(error), "err");
  }
}

function extractSplash() {
  if (!state.package3) return;
  try {
    decodeSplashCanvas(state.package3).toBlob((blob) => {
      if (!blob) {
        setStatus("Could not encode PNG.", "err");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "atmosphere-splash.png";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Extracted current splash as atmosphere-splash.png.", "ok");
    }, "image/png");
  } catch (error) {
    setStatus(error.message || String(error), "err");
  }
}

clearCanvas(preview);
clearCanvas(pkgPreview);

wireDrop(pkgDrop, pkgInput, (file) => {
  loadPackage(file).catch((error) => {
    state.package3 = null;
    state.slotLooksSafe = false;
    pkgMeta.textContent = "No file loaded";
    clearCanvas(pkgPreview);
    setStatus(error.message || String(error), "err");
    updateButtons();
  });
});

wireDrop(imgDrop, imgInput, (file) => {
  loadImage(file).catch((error) => {
    setStatus(error.message || String(error), "err");
  });
});

injectBtn.addEventListener("click", injectSplash);
extractBtn.addEventListener("click", extractSplash);
updateButtons();
