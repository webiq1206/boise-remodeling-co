/**
 * Browser side of the short request's follow-up: file uploads and step 2 details, both keyed by
 * the request id and short-lived token step 1 returned. Never throws: every outcome is a value
 * the success screen can show in plain words.
 */

export interface RequestFollowUp {
  requestId: string;
  token: string;
}

export type FileUpload =
  | { file: File; status: "uploading" }
  | { file: File; status: "stored"; key: string }
  | { file: File; status: "failed"; message: string };

const FALLBACK = "It did not upload.";

export async function uploadRequestFile(followUp: RequestFollowUp, file: File): Promise<FileUpload> {
  try {
    const body = new FormData();
    body.set("requestId", followUp.requestId);
    body.set("token", followUp.token);
    body.set("file", file);
    const res = await fetch("/api/consultation/files", { method: "POST", body });
    const data = (await res.json().catch(() => null)) as
      | { stored?: boolean; file?: { key: string }; message?: string }
      | null;
    if (res.ok && data?.stored && data.file?.key) return { file, status: "stored", key: data.file.key };
    return { file, status: "failed", message: data?.message || FALLBACK };
  } catch {
    return { file, status: "failed", message: "The connection dropped while it uploaded." };
  }
}

/** Uploads one file at a time, so a phone on a weak signal is not sending ten at once. */
export async function uploadRequestFiles(
  followUp: RequestFollowUp,
  files: File[],
  onProgress: (uploads: FileUpload[]) => void,
): Promise<FileUpload[]> {
  const uploads: FileUpload[] = files.map((file) => ({ file, status: "uploading" }));
  onProgress([...uploads]);
  for (let index = 0; index < files.length; index += 1) {
    uploads[index] = await uploadRequestFile(followUp, files[index]);
    onProgress([...uploads]);
  }
  return uploads;
}

export async function saveRequestDetails(
  followUp: RequestFollowUp,
  details: { projectType?: string; address?: string; timing?: string; email?: string },
  fileKeys: string[],
): Promise<{ ok: true; unchanged: boolean } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/consultation/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: followUp.requestId, token: followUp.token, details, files: fileKeys }),
    });
    const data = (await res.json().catch(() => null)) as { saved?: boolean; unchanged?: boolean; message?: string } | null;
    if (res.ok && data?.saved) return { ok: true, unchanged: Boolean(data.unchanged) };
    return { ok: false, message: data?.message || "We could not save that just now. Try again, or call us." };
  } catch {
    return { ok: false, message: "We could not save that just now. Try again, or call us." };
  }
}
