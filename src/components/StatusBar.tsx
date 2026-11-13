import type { StatusKind } from "../types";

interface StatusBarProps {
  text: string;
  kind: StatusKind;
}

export function StatusBar({ text, kind }: StatusBarProps) {
  return (
    <div className={kind ? `status ${kind}` : "status"} role="status">
      {text}
    </div>
  );
}
