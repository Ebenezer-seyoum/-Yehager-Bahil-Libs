import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export async function getSignedUploadParams(folder: string, publicId?: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };

  if (publicId) {
    paramsToSign.public_id = publicId;
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    folder,
    publicId,
    timestamp,
    signature,
  };
}
