import { friendlyUploadErrorMessage } from "@/lib/friendly-errors";

type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};

type SignedUpload = {
  bucket: string;
  region: string;
  key: string;
  contentType: string;
  uploadUrl: string;
  publicUrl: string;
};

export async function uploadFileToS3(file: File, folder: string) {
  const contentType = file.type?.trim() || "application/octet-stream";

  let signRes: Response;
  try {
    signRes = await fetch("/api/backend/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder, fileName: file.name, contentType }),
    });
  } catch (error) {
    throw new Error(friendlyUploadErrorMessage(error));
  }
  const signedPayload = (await signRes.json().catch(() => null)) as ApiResponse<SignedUpload> | null;
  if (!signRes.ok || !signedPayload?.data) {
    throw new Error(friendlyUploadErrorMessage(signedPayload?.error ?? signedPayload?.message ?? "Could not start upload."));
  }

  const signed = signedPayload.data;
  let uploadRes: Response;
  try {
    uploadRes = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": signed.contentType },
      body: file,
    });
  } catch (error) {
    throw new Error(friendlyUploadErrorMessage(error));
  }
  if (!uploadRes.ok) {
    throw new Error(friendlyUploadErrorMessage(`Upload failed with status ${uploadRes.status}.`));
  }

  return signed.publicUrl;
}

/**
 * Given a stored plain S3 URL (e.g. https://bucket.s3.region.amazonaws.com/uploads/file.jpg),
 * extract the object key and exchange it for a short-lived pre-signed GET URL via the backend.
 * Falls back to the original URL on error so images degrade gracefully.
 */
export async function getSignedImageUrl(s3Url: string): Promise<string> {
  try {
    // Strip the base URL to get the object key
    const url = new URL(s3Url);
    // pathname starts with '/', remove leading slash
    const key = url.pathname.replace(/^\//, "");

    const res = await fetch("/api/backend/uploads/read-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) return s3Url;
    const payload = (await res.json()) as { url?: string };
    return payload.url ?? s3Url;
  } catch {
    return s3Url;
  }
}
