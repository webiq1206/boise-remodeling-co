"use client";

import { useRef, useState } from "react";
import { Camera, Check, FileText, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UploadStatus } from "@/lib/uploadWithProgress";

export interface UploadFieldProps {
  files: File[];
  onAdd: (files: File[], method: "picker" | "camera" | "drop") => void;
  onRemove: (file: File) => void;
  /** Accept attribute for the plain picker. */
  accept: string;
  /** Plain-language description of accepted types, e.g. "PDFs, photos or scans". */
  acceptLabel: string;
  /** Plain-language size limit, e.g. "Up to 24 MB total across 12 files". */
  limitLabel?: string;
  /** Offer a camera-capture button on touch devices. */
  allowCamera?: boolean;
  headline?: string;
  disabled?: boolean;
  /**
   * Live send state while the files travel and are read. Uploading shows a
   * real percentage; processing shows an indeterminate sweep, because that is
   * the slow server-side read and stillness there looks like a hang.
   */
  status?: UploadStatus | null;
  /** What the processing phase is doing, e.g. "Reading your documents...". */
  processingLabel?: string;
}

const prettyBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileKey = (f: File) => `${f.name}:${f.size}`;

/**
 * Shared upload control for every document/photo step. States accepted types
 * and the size limit up front, confirms each file with its name and size,
 * offers camera capture on phones, and lets any file be removed. The parent
 * owns the file list so uploads survive moving between steps.
 */
export function UploadField({
  files,
  onAdd,
  onRemove,
  accept,
  acceptLabel,
  limitLabel,
  allowCamera = true,
  headline = "Add your files",
  disabled = false,
  status = null,
  processingLabel = "Reading your documents...",
}: UploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setIsDragging(false);
          onAdd(Array.from(e.dataTransfer?.files ?? []), "drop");
        }}
        data-testid="upload-dropzone"
        className={cn(
          "rounded-md border border-dashed p-6 text-center transition-colors",
          isDragging
            ? "border-accent-legible bg-accent-legible/10"
            : "border-inverse-foreground/30 bg-inverse-foreground/[0.04]",
        )}
      >
        <Upload className="mx-auto mb-3 h-6 w-6 text-inverse-muted" aria-hidden="true" />
        <span className="hidden [@media(pointer:fine)]:block text-[15px] text-inverse-foreground">
          {isDragging ? "Drop them here" : "Drag your files here, or"}
        </span>
        <span className="[@media(pointer:fine)]:hidden block text-[15px] text-inverse-foreground">
          {headline}
        </span>
        <span className="mt-1 block text-[12.5px] text-inverse-muted">{acceptLabel}</span>
        {limitLabel ? (
          <span className="mt-0.5 block text-[12px] text-inverse-muted/80">{limitLabel}</span>
        ) : null}

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="heroGhost"
            className="min-h-12 w-full sm:w-auto"
            disabled={disabled}
            onClick={() => pickerRef.current?.click()}
            data-testid="upload-choose"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span className="hidden [@media(pointer:fine)]:inline">Browse files</span>
            <span className="[@media(pointer:fine)]:hidden">Choose files or photos</span>
          </Button>
          {allowCamera ? (
            <Button
              type="button"
              variant="heroGhost"
              className="min-h-12 w-full sm:w-auto [@media(pointer:fine)]:hidden"
              disabled={disabled}
              onClick={() => cameraRef.current?.click()}
              data-testid="upload-camera"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              Take a photo
            </Button>
          ) : null}
        </div>

        <input
          ref={pickerRef}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          data-testid="upload-input"
          onChange={(e) => {
            onAdd(Array.from(e.target.files ?? []), "picker");
            e.target.value = "";
          }}
        />
        {allowCamera ? (
          <input
            ref={cameraRef}
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            className="sr-only"
            data-testid="upload-camera-input"
            onChange={(e) => {
              onAdd(Array.from(e.target.files ?? []), "camera");
              e.target.value = "";
            }}
          />
        ) : null}
      </div>

      {status ? (
        <div
          className="mt-4 rounded-md border border-accent-legible/30 bg-inverse-foreground/[0.05] p-3.5"
          role="status"
          aria-live="polite"
          data-testid="upload-status"
        >
          <div className="flex items-center justify-between gap-3 text-[13px] text-inverse-foreground">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent-legible" aria-hidden="true" />
              {status.phase === "uploading" ? "Sending your files..." : processingLabel}
            </span>
            {status.phase === "uploading" && status.percent !== null ? (
              <span className="tabular-nums text-inverse-muted">{status.percent}%</span>
            ) : null}
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-inverse-foreground/15">
            {status.phase === "uploading" && status.percent !== null ? (
              <div
                className="h-full rounded-full bg-accent-legible transition-[width] duration-200 ease-out"
                style={{ width: `${status.percent}%` }}
              />
            ) : (
              <div className="h-2/4 min-h-full w-2/5 rounded-full bg-accent-legible/80 wizard-progress-sweep" />
            )}
          </div>
          {status.phase === "processing" ? (
            <p className="mt-2 text-[12px] text-inverse-muted">
              Your files are in. This is the reading step, and a large set can take a minute or two.
            </p>
          ) : null}
        </div>
      ) : null}

      {files.length > 0 ? (
        <ul className="mt-4 space-y-2" data-testid="upload-file-list">
          {files.map((f) => (
            <li
              key={fileKey(f)}
              className="flex items-center gap-3 rounded-md border border-inverse-foreground/15 bg-inverse-foreground/[0.05] px-3 py-2.5"
            >
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent-legible/20">
                <Check className="h-3.5 w-3.5 text-accent-legible" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] text-inverse-foreground">{f.name}</span>
                <span className="block text-[11.5px] text-inverse-muted">{prettyBytes(f.size)} - ready</span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(f)}
                disabled={disabled}
                aria-label={`Remove ${f.name}`}
                data-testid="upload-remove"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-inverse-muted hover:bg-inverse-foreground/10 hover:text-inverse-foreground disabled:opacity-40 disabled:pointer-events-none"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
