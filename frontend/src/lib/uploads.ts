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

  const signRes = await fetch("/api/backend/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, fileName: file.name, contentType }),
  });
  const signedPayload = (await signRes.json().catch(() => null)) as ApiResponse<SignedUpload> | null;
  if (!signRes.ok || !signedPayload?.data) {
    throw new Error(signedPayload?.error ?? signedPayload?.message ?? "Could not start upload.");
  }

  const signed = signedPayload.data;
  const uploadRes = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": signed.contentType },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error("Upload failed.");
  }

  return signed.publicUrl;
}