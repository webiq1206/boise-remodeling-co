/**
 * POST a FormData body and report real upload progress.
 *
 * fetch() cannot observe request-body progress, so a 20 MB plan set uploaded
 * over a phone connection sat behind a spinner with no sign anything was
 * happening. XHR exposes upload.onprogress; once the body is fully sent the
 * phase flips to "processing", which for these wizards means the document is
 * being read on the server - the slow part a user most needs named.
 */

export interface UploadStatus {
  phase: "uploading" | "processing";
  /** 0-100 while uploading; null when the total is unknown or processing. */
  percent: number | null;
}

export interface UploadResult {
  ok: boolean;
  status: number;
  data: unknown;
}

export function postFormWithProgress(
  url: string,
  form: FormData,
  onStatus: (status: UploadStatus) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "text";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
        onStatus(percent >= 100 ? { phase: "processing", percent: null } : { phase: "uploading", percent });
      } else {
        onStatus({ phase: "uploading", percent: null });
      }
    };
    xhr.upload.onload = () => onStatus({ phase: "processing", percent: null });

    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = null;
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.onabort = () => reject(new Error("aborted"));

    xhr.send(form);
  });
}
