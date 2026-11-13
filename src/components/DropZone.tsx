import { useCallback, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";

interface DropZoneProps {
  title: string;
  subtitle: string;
  accept?: string;
  onFile: (file: File) => void;
}

export function DropZone({ title, subtitle, accept, onFile }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [drag, setDrag] = useState(false);

  const takeFile = useCallback(
    (file: File | undefined) => {
      if (file) onFile(file);
    },
    [onFile],
  );

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    takeFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDrag(false);
    takeFile(event.dataTransfer.files?.[0]);
  };

  return (
    <label
      className={`drop${drag ? " drag" : ""}`}
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        onChange={onInputChange}
      />
      <span className="drop-title">{title}</span>
      <span className="drop-sub">{subtitle}</span>
    </label>
  );
}
