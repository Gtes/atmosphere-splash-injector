export function injectedFileName(name: string): string {
  const cleaned = (name.trim() || "package3").replace(/\.bak$/i, "");
  const dot = cleaned.lastIndexOf(".");
  const hasExt = dot > 0 && dot < cleaned.length - 1 && !cleaned.slice(dot + 1).includes("/");
  const stem = hasExt ? cleaned.slice(0, dot) : cleaned;
  const ext = hasExt ? cleaned.slice(dot) : "";
  if (stem.endsWith("_injected")) return `${stem}${ext}`;
  return `${stem}_injected${ext}`;
}
