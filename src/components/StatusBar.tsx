import type { StatusKind } from "../types";

interface StatusBarProps {
  text: string;
  kind: StatusKind;
}

export function StatusBar({ text, kind }: StatusBarProps) {
  return (
    <div className={kind ? `status ${kind}` : "status"} role="status">
      {text.split("\n").map((line, index) => (
        <p key={`${index}-${line.slice(0, 24)}`} className="status-line">
          {line}
        </p>
      ))}
    </div>
  );
}
