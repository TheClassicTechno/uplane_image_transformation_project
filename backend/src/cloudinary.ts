// Cloudinary upload/delete helpers.
import { v2 as cloudinary } from "cloudinary";

type UploadResult = {
  url: string;
  publicId: string;
};

const requiredEnv = (key: string): string | null => {
  const value = process.env[key];
  return value ?? null;
};

const getEnvOrThrow = (keys: string[]): Record<string, string> => {
  const missing = keys.filter((key) => !requiredEnv(key));
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(
        ", "
      )}. Create backend/.env as shown in README.md.`
    );
  }

  return keys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = requiredEnv(key) as string;
    return acc;
  }, {});
};

export const configureCloudinary = (): void => {
  // Ensure required secrets are present before initialization.
  const env = getEnvOrThrow([
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ]);

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
};

export const uploadBuffer = async (
  buffer: Buffer,
  options: { folder: string; filename: string; format?: string }
): Promise<UploadResult> => {
  // Stream upload avoids writing temp files.
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.filename,
        format: options.format,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    stream.end(buffer);
  });
};

export const deleteByPublicId = async (publicId: string): Promise<void> => {
  // Best-effort cleanup of hosted assets.
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
};
