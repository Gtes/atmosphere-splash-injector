export type StatusKind = "" | "ok" | "warn" | "err";

export interface ContentEntry {
  name: string;
  offset: number;
  size: number;
  end: number;
}

export interface PackageInspection {
  safe: boolean;
  kind: StatusKind;
  message: string;
  entries: ContentEntry[];
  overlaps: ContentEntry[];
  padRows: number;
}

export interface AppState {
  package3: Uint8Array | null;
  packageName: string;
  imageBitmap: ImageBitmap | null;
  imageName: string;
  slotLooksSafe: boolean;
}
