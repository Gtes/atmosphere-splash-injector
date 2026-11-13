import { PKG_SIZE, ROT_W, SPLASH_END, SPLASH_OFFSET, STRIDE } from "../constants";
import type { PackageInspection, StatusKind } from "../types";
import { parseContentEntries } from "./parse";

function splashPadRows(bytes: Uint8Array): number {
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

export function inspectPackage3(bytes: Uint8Array, fileName: string): PackageInspection {
  if (bytes.length !== PKG_SIZE) {
    throw new Error(`Expected ${PKG_SIZE} bytes (8 MB), got ${bytes.length}`);
  }
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "PK31") {
    throw new Error("File does not start with PK31");
  }

  const entries = parseContentEntries(bytes);
  const overlaps = entries.filter(
    (entry) => entry.end > SPLASH_OFFSET && entry.offset < SPLASH_END,
  );
  const padRows = splashPadRows(bytes);
  const slotLooksLikeSplash = padRows >= 24;

  let message: string;
  let kind: StatusKind;
  let safe: boolean;

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
