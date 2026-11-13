import { useCallback, useEffect, useMemo, useState } from "react";
import { DropZone } from "./components/DropZone";
import { SplashPreview, type PreviewSource } from "./components/SplashPreview";
import { StatusBar } from "./components/StatusBar";
import { ROT_H, ROT_W, SPLASH_OFFSET, SRC_H, SRC_W } from "./constants";
import { canvasToPngDownload, downloadBytes } from "./download";
import { inspectPackage3 } from "./package3/inspect";
import type { StatusKind } from "./types";

function injectedFileName(name: string): string {
  const cleaned = (name.trim() || "package3").replace(/\.bak$/i, "");
  const dot = cleaned.lastIndexOf(".");
  const hasExt = dot > 0 && dot < cleaned.length - 1 && !cleaned.slice(dot + 1).includes("/");
  const stem = hasExt ? cleaned.slice(0, dot) : cleaned;
  const ext = hasExt ? cleaned.slice(dot) : "";
  if (stem.endsWith("_injected")) return `${stem}${ext}`;
  return `${stem}_injected${ext}`;
}

export function App() {
  const [package3, setPackage3] = useState<Uint8Array | null>(null);
  const [packageName, setPackageName] = useState("package3");
  const [slotLooksSafe, setSlotLooksSafe] = useState(false);
  const [pkgMeta, setPkgMeta] = useState("No file loaded");
  const [pkgPreview, setPkgPreview] = useState<PreviewSource>({ kind: "empty" });

  const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);
  const [imgMeta, setImgMeta] = useState("No image loaded");

  const [statusText, setStatusText] = useState("Load package3 and an image to continue.");
  const [statusKind, setStatusKind] = useState<StatusKind>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      imageBitmap?.close();
    };
  }, [imageBitmap]);

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
          const { decodeSplashCanvas } = await import("./splash/decode");
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

  const loadImage = useCallback(
    async (file: File) => {
      try {
        setBusy(true);
        const bitmap = await createImageBitmap(file);
        if (
          !(bitmap.width === SRC_W && bitmap.height === SRC_H) &&
          !(bitmap.width === ROT_W && bitmap.height === ROT_H)
        ) {
          bitmap.close();
          throw new Error(`Image must be ${SRC_W}×${SRC_H} (or already ${ROT_W}×${ROT_H})`);
        }

        setImageBitmap((previous) => {
          previous?.close();
          return bitmap;
        });
        setImgMeta(`${file.name} · ${bitmap.width}×${bitmap.height}`);

        if (package3 && slotLooksSafe) {
          setStatus("Ready to inject. Processing stays in this browser.", "ok");
        } else if (!package3) {
          setStatus("Image loaded. Next: load a stock Atmosphere package3.", "ok");
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), "err");
      } finally {
        setBusy(false);
      }
    },
    [package3, setStatus, slotLooksSafe],
  );

  const injectSplash = useCallback(async () => {
    if (!package3 || !imageBitmap || !slotLooksSafe) return;
    try {
      setBusy(true);
      setStatus("Converting image and patching package3…");
      const { convertImageToSplash } = await import("./splash/convert");
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
      const { decodeSplashCanvas } = await import("./splash/decode");
      await canvasToPngDownload(decodeSplashCanvas(package3), "atmosphere-splash.png");
      setStatus("Extracted current splash as atmosphere-splash.png.", "ok");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "err");
    } finally {
      setBusy(false);
    }
  }, [package3, setStatus]);

  return (
    <div className="page">
      <header className="header">
        <p className="eyebrow">Atmosphere · package3</p>
        <h1>Splash Injector</h1>
        <p className="lede">
          Client-side tool for stock Atmosphere. Matches{" "}
          <code>utilities/insert_splash_screen.py</code>: 1280×720 image → BGRA splash at offset{" "}
          <code>0x400000</code>.
        </p>
      </header>

      <main className="grid">
        <section className="panel">
          <h2>1. package3</h2>
          <DropZone
            title="Drop package3 here"
            subtitle="Must be PK31 · exactly 8 MB"
            onFile={(file) => {
              void loadPackage(file);
            }}
          />
          <SplashPreview
            label="Current splash in package3"
            source={pkgPreview}
            canvasLabel="Current package3 splash"
          />
          <p className="file-meta">{pkgMeta}</p>
        </section>

        <section className="panel">
          <h2>2. New splash image</h2>
          <DropZone
            title="Drop 1280×720 image"
            subtitle="PNG / BMP / JPEG · landscape 1280×720"
            accept="image/png,image/jpeg,image/bmp,image/webp"
            onFile={(file) => {
              void loadImage(file);
            }}
          />
          <SplashPreview
            label="New image preview"
            source={imagePreview}
            canvasLabel="New splash preview"
          />
          <p className="file-meta">{imgMeta}</p>
        </section>

        <section className="panel actions">
          <h2>3. Patch &amp; download</h2>
          <p className="note">
            Files never leave this browser. Official Atmosphere only — not custom builds that store
            a splash inside <code>boot</code>.
          </p>
          <StatusBar text={statusText} kind={statusKind} />
          <div className="buttons">
            <button type="button" disabled={!canInject} onClick={() => void injectSplash()}>
              Inject splash &amp; download
            </button>
            <button
              type="button"
              className="ghost"
              disabled={!canExtract}
              onClick={() => void extractSplash()}
            >
              Extract current splash
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          Logic from{" "}
          <a
            href="https://github.com/Atmosphere-NX/Atmosphere/blob/master/utilities/insert_splash_screen.py"
            rel="noopener noreferrer"
            target="_blank"
          >
            Atmosphere insert_splash_screen.py
          </a>
          . If the splash slot overlaps modules, injection is blocked.
        </p>
        <p>
          Licensed under <a href="./LICENSE">GPL-2.0</a>. See <a href="./NOTICE">NOTICE</a> for
          Atmosphère attribution. Free to use; no warranty.
        </p>
      </footer>
    </div>
  );
}
