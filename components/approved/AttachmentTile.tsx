"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import {
  MAX_REQUEST_FILES,
  MAX_REQUEST_FILE_MB,
  REQUEST_FILE_ACCEPT,
  checkRequestFile,
  formatFileSize,
} from "@/shared/requestFiles";

/** Image types every browser can draw as a thumbnail. HEIC and PDFs get an icon instead. */
const PREVIEWABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * "Add photos, plans or files": one friendly tile instead of the browser's raw file control.
 * Tap opens the native picker (camera, photo library and files on a phone); drag and drop works
 * on a desktop. A file that is too large or the wrong type is named in a plain inline line and
 * left out; the rest of the form is never blocked by it.
 */
export function AttachmentTile({
  files,
  onChange,
  fieldName = "files",
  title = "Add photos, plans or files",
  testId = "request-attachments",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  fieldName?: string;
  title?: string;
  testId?: string;
}) {
  const uid = useId();
  const [notes, setNotes] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const previews = useMemo(
    () => files.map((file) => (PREVIEWABLE.has(file.type) ? URL.createObjectURL(file) : "")),
    [files],
  );
  useEffect(
    () => () => {
      for (const url of previews) if (url) URL.revokeObjectURL(url);
    },
    [previews],
  );

  function add(list: FileList | File[] | null) {
    if (!list) return;
    const next = [...files];
    const messages: string[] = [];
    for (const file of Array.from(list)) {
      if (next.some((existing) => existing.name === file.name && existing.size === file.size)) continue;
      const check = checkRequestFile({ name: file.name, type: file.type, size: file.size });
      if (!check.ok) {
        messages.push(check.reason);
        continue;
      }
      if (next.length >= MAX_REQUEST_FILES) {
        messages.push(`You can add up to ${MAX_REQUEST_FILES} files. Text us any others.`);
        break;
      }
      next.push(file);
    }
    setNotes(messages);
    onChange(next);
  }

  return (
    <div className="fold-field fold-attach" data-field={fieldName} data-testid={testId}>
      <label
        className={`fold-tile${dragging ? " is-dragging" : ""}`}
        htmlFor={`${uid}-input`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          add(event.dataTransfer.files);
        }}
      >
        <Paperclip size={22} aria-hidden="true" className="fold-tile-icon" />
        <span className="fold-tile-text">
          <span className="fold-tile-title" id={`${uid}-title`}>
            {title}
          </span>
          <span className="fold-tile-hint" id={`${uid}-hint`}>
            Optional. Photos, PDFs or drawings. Up to {MAX_REQUEST_FILES} files, {MAX_REQUEST_FILE_MB} MB each.
          </span>
        </span>
        <input
          id={`${uid}-input`}
          className="fold-tile-input"
          data-clarity-mask="True"
          type="file"
          accept={REQUEST_FILE_ACCEPT}
          multiple
          aria-labelledby={`${uid}-title`}
          aria-describedby={`${uid}-hint${notes.length ? ` ${uid}-notes` : ""}`}
          onChange={(event) => {
            add(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="fold-chips" aria-label="Files to send">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}`} className="fold-chip">
              {previews[index] ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a site image
                <img src={previews[index]} alt="" className="fold-chip-thumb" />
              ) : (
                <span className="fold-chip-thumb fold-chip-icon" aria-hidden="true">
                  <FileText size={20} />
                </span>
              )}
              <span className="fold-chip-text">
                <span className="fold-chip-name" data-clarity-mask="True">
                  {file.name}
                </span>
                <span className="fold-chip-size">{formatFileSize(file.size)}</span>
              </span>
              <button
                type="button"
                className="fold-chip-remove"
                aria-label={`Remove ${file.name}`}
                onClick={() => {
                  setNotes([]);
                  onChange(files.filter((item) => item !== file));
                }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div id={`${uid}-notes`} className="fold-field-error" aria-live="polite">
        {notes.map((note) => (
          <p key={note} className="fold-attach-note">
            {note}
          </p>
        ))}
      </div>
    </div>
  );
}
