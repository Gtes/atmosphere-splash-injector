import { useCallback, useEffect, useMemo, useState } from "react";
import type { PreviewSource } from "../components/SplashPreview";
import { ROT_H, ROT_W, SPLASH_OFFSET, SRC_H, SRC_W } from "../constants";
import { canvasToPngDownload, downloadBytes } from "../download";
import { injectedFileName } from "../lib/injectedFileName";
import { inspectPackage3 } from "../package3/inspect";
import type { StatusKind } from "../types";

export interface PendingImage {
  name: string;
  bitmap: ImageBitmap;
}

export function useSplashInjector() {
  const [package3, setPackage3] = useState<Uint8Array | null>(null);
  const [packageName, setPackageName] = useState("package3");
  const [slotLooksSafe, setSlotLooksSafe] = useState(false);
  const [pkgMeta, setPkgMeta] = useState("No file loaded");
  const [pkgPreview, setPkgPreview] = useState<PreviewSource>({ kind: "empty" });

  const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [imgMeta, setImgMeta] = useState("No image loaded");

  const [statusText, setStatusText] = useState("Load package3 and an image to continue.");
  const [statusKind, setStatusKind] = useState<StatusKind>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      imageBitmap?.close();
    };
  }, [imageBitmap]);

  useEffect(() => {
    return () => {
      pendingImage?.bitmap.close();
    };
  }, [pendingImage]);

  const imagePreview = useMemo<PreviewSource>(
    () => (imageBitmap ? { kind: "bitmap", bitmap: imageBitmap } : { kind: "empty" }),
    [imageBitmap],
  );

  const canInject = Boolean(package3 && imageBitmap && slotLooksSafe && !busy);
  const canExtract = Boolean(package3 && !busy);

  const setStatus = useCallback((text: string, kind: StatusKind = "") => {
    setStatusText(text);
    setStatusKind(kind);
  }, []);

  const loadPackage = useCallback(
    async (file: File) => {
      try {
        setBusy(true);
        const bytes = new Uint8Array(await file.arrayBuffer());
        const info = inspectPackage3(bytes, file.name);
        setPackage3(bytes);
        setPackageName(file.name || "package3");
        setSlotLooksSafe(info.safe);
        setPkgMeta(`${file.name} · ${bytes.length} bytes · pad-check ${info.padRows}/32`);

        if (info.padRows >= 24) {
          const { decodeSplashCanvas } = await import("../splash/decode");
          setPkgPreview({ kind: "canvas", canvas: decodeSplashCanvas(bytes) });
        } else {
          setPkgPreview({ kind: "placeholder", text: "No official splash preview" });
        }

        setStatus(info.message, info.kind);
      } catch (error) {
        setPackage3(null);
        setSlotLooksSafe(false);
        setPkgMeta("No file loaded");
        setPkgPreview({ kind: "empty" });
        setStatus(error instanceof Error ? error.message : String(error), "err");
      } finally {
        setBusy(false);
      }
    },
    [setStatus],
  );

  const acceptImage = useCallback(
    (bitmap: ImageBitmap, name: string) => {
      setPendingImage((previous) => {
        previous?.bitmap.close();
        return null;
      });
      setImageBitmap((previous) => {
        previous?.close();
        return bitmap;
      });
      setImgMeta(`${name} · ${bitmap.width}×${bitmap.height}`);

      if (package3 && slotLooksSafe) {
        setStatus("Ready to inject. Processing stays in this browser.", "ok");
      } else if (!package3) {
        setStatus("Image loaded. Next: load a stock Atmosphere package3.", "ok");
      }
    },
    [package3, setStatus, slotLooksSafe],
  );

  const loadImage = useCallback(
    async (file: File) => {
      try {
        setBusy(true);
        const bitmap = await createImageBitmap(file);
        const okSize =
          (bitmap.width === SRC_W && bitmap.height === SRC_H) ||
          (bitmap.width === ROT_W && bitmap.height === ROT_H);

        if (!okSize) {
          setImageBitmap((previous) => {
            previous?.close();
            return null;
          });
          setPendingImage((previous) => {
            previous?.bitmap.close();
            return { name: file.name, bitmap };
          });
          setImgMeta(`${file.name} · ${bitmap.width}×${bitmap.height} (needs ${SRC_W}×${SRC_H})`);
          setStatus(
            [
              `Image is ${bitmap.width}×${bitmap.height}, but Atmosphere needs ${SRC_W}×${SRC_H} (or ${ROT_W}×${ROT_H}).`,
              "Drag to pan, zoom with the slider or scroll wheel, then Apply crop.",
            ].join("\n"),
            "warn",
          );
          return;
        }

        acceptImage(bitmap, file.name);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), "err");
      } finally {
        setBusy(false);
      }
    },
    [acceptImage, setStatus],
  );

  const applyPendingCrop = useCallback(
    async (cropped: ImageBitmap) => {
      if (!pendingImage) {
        cropped.close();
        return;
      }
      const name = pendingImage.name;
      acceptImage(cropped, name);
      setStatus(`Cropped ${name} to ${SRC_W}×${SRC_H}.`, "ok");
    },
    [acceptImage, pendingImage, setStatus],
  );

  const injectSplash = useCallback(async () => {
    if (!package3 || !imageBitmap || !slotLooksSafe) return;
    try {
      setBusy(true);
      setStatus("Converting image and patching package3…");
      const { convertImageToSplash } = await import("../splash/convert");
      const splash = convertImageToSplash(imageBitmap);
      // Always patch a copy. The loaded package3 in memory/preview stays unchanged.
      const patched = new Uint8Array(package3);
      patched.set(splash, SPLASH_OFFSET);

      const outName = injectedFileName(packageName);
      downloadBytes(patched, outName);
      setStatus(
        [
          `Download started: ${outName}`,
          "Copy it to atmosphere/package3 on the SD card (replace the existing file).",
          "The loaded package3 preview above is unchanged.",
        ].join("\n"),
        "ok",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "err");
    } finally {
      setBusy(false);
    }
  }, [imageBitmap, package3, packageName, setStatus, slotLooksSafe]);

  const extractSplash = useCallback(async () => {
    if (!package3) return;
    try {
      setBusy(true);
      const { decodeSplashCanvas } = await import("../splash/decode");
      await canvasToPngDownload(decodeSplashCanvas(package3), "atmosphere-splash.png");
      setStatus("Extracted current splash as atmosphere-splash.png.", "ok");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "err");
    } finally {
      setBusy(false);
    }
  }, [package3, setStatus]);

  return {
    busy,
    statusText,
    statusKind,
    pkgMeta,
    pkgPreview,
    imgMeta,
    imagePreview,
    pendingImage,
    canInject,
    canExtract,
    loadPackage,
    loadImage,
    applyPendingCrop,
    injectSplash,
    extractSplash,
  };
}
