import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

interface DropZoneProps {
  title: string;
  subtitle: string;
  accept?: string;
  hint?: ReactNode;
  disabled?: boolean;
  onFile: (file: File) => void;
}

export function DropZone({
  title,
  subtitle,
  accept,
  hint,
  disabled = false,
  onFile,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [drag, setDrag] = useState(false);
  const dragDepth = useRef(0);

  const takeFile = useCallback(
    (file: File | undefined) => {
      if (file && !disabled) onFile(file);
    },
    [disabled, onFile],
  );

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    takeFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const onDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setDrag(true);
  };

  const onDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDrag(false);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDrag(false);
    takeFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="drop-block">
      <label
        className={`drop${drag ? " drag" : ""}${disabled ? " disabled" : ""}`}
        htmlFor={inputId}
        aria-disabled={disabled}
        onDragEnter={onDragEnter}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          hidden
          accept={accept}
          disabled={disabled}
          onChange={onInputChange}
        />
        <span className="drop-badge">{drag ? "Release to load" : "Drop or click"}</span>
        <span className="drop-title">{title}</span>
        <span className="drop-sub">{subtitle}</span>
      </label>
      {hint ? <p className="drop-hint">{hint}</p> : null}
    </div>
  );
}
