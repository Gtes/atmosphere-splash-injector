import { DropZone } from "./components/DropZone";
import { GitHubLink } from "./components/GitHubLink";
import { ImageCropEditor } from "./components/ImageCropEditor";
import { SplashPreview } from "./components/SplashPreview";
import { StatusBar } from "./components/StatusBar";
import { ThemeToggle } from "./components/ThemeToggle";
import { useSplashInjector } from "./hooks/useSplashInjector";
import { useTheme } from "./hooks/useTheme";

export function App() {
  const { theme, cycleTheme } = useTheme();
  const {
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
  } = useSplashInjector();

  return (
    <div className={`page${busy ? " is-busy" : ""}`} aria-busy={busy}>
      <header className="header">
        <div className="header-top">
          <p className="eyebrow">Atmosphere · package3</p>
          <div className="header-actions">
            <GitHubLink />
            <ThemeToggle theme={theme} onCycle={cycleTheme} />
          </div>
        </div>
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
            hint={
              <>
                From a stock Atmosphère release zip: <code>atmosphere/package3</code>.{" "}
                <a
                  href="https://github.com/Atmosphere-NX/Atmosphere/releases"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Get releases
                </a>
              </>
            }
            disabled={busy}
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
            title="Drop splash image"
            subtitle="PNG / BMP / JPEG / WebP · ideally 1280×720 landscape"
            accept="image/png,image/jpeg,image/bmp,image/webp"
            hint="Wrong sizes open a crop editor so you can pan and zoom before applying."
            disabled={busy}
            onFile={(file) => {
              void loadImage(file);
            }}
          />
          {pendingImage ? (
            <ImageCropEditor
              key={`${pendingImage.name}-${pendingImage.bitmap.width}x${pendingImage.bitmap.height}`}
              bitmap={pendingImage.bitmap}
              disabled={busy}
              onApply={applyPendingCrop}
            />
          ) : (
            <SplashPreview
              label="New image preview"
              source={imagePreview}
              canvasLabel="New splash preview"
            />
          )}
          <p className="file-meta">{imgMeta}</p>
        </section>

        <section className="panel actions">
          <h2>3. Patch &amp; download</h2>
          <p className="note">
            Files never leave this browser. Official Atmosphere only — not custom builds that store
            a splash inside <code>boot</code>.
          </p>
          <StatusBar text={statusText} kind={statusKind} busy={busy} />
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
