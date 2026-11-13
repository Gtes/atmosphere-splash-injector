import type { StatusKind } from "../types";

interface StatusBarProps {
  text: string;
  kind: StatusKind;
  busy?: boolean;
}

export function StatusBar({ text, kind, busy = false }: StatusBarProps) {
  return (
    <div
      className={[kind ? `status ${kind}` : "status", busy ? "busy" : ""].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
    >
      {busy ? <span className="status-spinner" aria-hidden="true" /> : null}
      <div className="status-copy">
        {text.split("\n").map((line, index) => (
          <p key={`${index}-${line.slice(0, 24)}`} className="status-line">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
