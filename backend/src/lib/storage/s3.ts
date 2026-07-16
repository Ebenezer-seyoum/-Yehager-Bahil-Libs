import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env.js";

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

function sanitizePathSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._/-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");
}

function buildObjectKey(folder: string, fileName?: string) {
  const cleanFolder = sanitizePathSegment(folder) || "uploads";
  const extension = fileName ? extname(fileName).toLowerCase() : "";
  const baseName = fileName ? sanitizePathSegment(fileName.slice(0, fileName.length - extension.length)) : "upload";
  const safeBase = baseName || "upload";
  return `${cleanFolder}/${safeBase}-${randomUUID()}${extension}`;
}

function buildPublicUrl(key: string) {
  const baseUrl = env.AWS_S3_PUBLIC_BASE_URL.replace(/\/+$/, "");
  const encodedKey = key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  return `${baseUrl}/${encodedKey}`;
}

export async function getSignedUploadParams(folder: string, fileName?: string, contentType?: string) {
  const key = buildObjectKey(folder, fileName);
  const resolvedContentType = contentType?.trim() || "application/octet-stream";

  const uploadUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      ContentType: resolvedContentType,
    }),
    { expiresIn: 15 * 60 },
  );

  return {
    bucket: env.AWS_S3_BUCKET,
    region: env.AWS_REGION,
    key,
    contentType: resolvedContentType,
    uploadUrl,
    publicUrl: buildPublicUrl(key),
  };
}

export async function getSignedReadUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }),
    { expiresIn },
  );
}

export function getObjectKeyFromPublicUrl(fileUrl: string) {
  try {
    const publicBase = new URL(env.AWS_S3_PUBLIC_BASE_URL);
    const parsed = new URL(fileUrl);
    if (parsed.origin !== publicBase.origin) return null;

    const basePath = publicBase.pathname.replace(/\/+$/, "");
    if (!parsed.pathname.startsWith(`${basePath}/`)) return null;

    return decodeURIComponent(parsed.pathname.slice(basePath.length + 1));
  } catch {
    return null;
  }
}
