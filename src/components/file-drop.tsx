import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileUp, X } from "lucide-react";
import { pickDocument, type PickedFile } from "@/lib/files";
import { formatBytes } from "@/lib/format";

/**
 * Keyboard-accessible file picker with drag & drop. Always keeps a real
 * <input type="file"> so keyboard users can operate it directly.
 */
export function FileDrop({
  accept,
  label,
  hint,
  value,
  onChange,
  disabled,
  extensions,
}: {
  accept: string;
  label: string;
  hint?: string;
  value: PickedFile | null;
  onChange: (file: PickedFile | null) => void;
  disabled?: boolean;
  extensions?: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const picked = await pickDocument(file, extensions);
      onChange(picked);
    } catch (err: any) {
      setError(err?.message || "Could not read that file.");
      onChange(null);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) void handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-foreground">{value.filename}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(value.sizeBytes)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${value.filename}`}
            disabled={disabled}
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
            dragOver && "border-primary bg-accent",
            disabled && "opacity-60"
          )}
        >
          <FileUp className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">{busy ? "Reading file…" : label}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="sr-only"
            id={`file-${label.replace(/\s+/g, "-").toLowerCase()}`}
            disabled={disabled}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            Choose file
          </Button>
        </div>
      )}
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
