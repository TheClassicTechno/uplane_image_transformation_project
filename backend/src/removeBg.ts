// remove.bg integration with retries.
import path from "path";
import sharp from "sharp";
const requiredEnv = (key: string): string | null => {
  const value = process.env[key];
  return value ?? null;
};

// Read a required API key with a clear error.
const getEnvOrThrow = (key: string): string => {
  const value = requiredEnv(key);
  if (!value) {
    throw new Error(
      `Missing required env var: ${key}. Create backend/.env as shown in README.md.`
    );
  }
  return value;
};

const mimeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const ensureFileExtension = (filename: string, mimeType: string) => {
  const ext = path.extname(filename);
  if (ext) {
    return filename;
  }
  const mapped = mimeToExtension[mimeType];
  return mapped ? `${filename}.${mapped}` : filename;
};

const replaceExtension = (filename: string, newExtension: string) => {
  const ext = path.extname(filename);
  if (!ext) {
    return `${filename}.${newExtension}`;
  }
  return filename.replace(/\.[^.]+$/, `.${newExtension}`);
};

export const removeBackground = async (
  imageBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<Buffer> => {
  const apiKey = getEnvOrThrow("REMOVE_BG_API_KEY");
  // Retry on transient remove.bg failures.
  const maxAttempts = 3;
  const baseDelayMs = 400;
  const safeFilename = ensureFileExtension(filename || "upload", mimeType);

  let normalizedBuffer = imageBuffer;
  let normalizedMimeType = mimeType;
  let normalizedFilename = safeFilename;

  if (mimeType === "image/avif") {
    normalizedBuffer = await sharp(imageBuffer).png().toBuffer();
    normalizedMimeType = "image/png";
    normalizedFilename = replaceExtension(safeFilename, "png");
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(normalizedBuffer)], {
        type: normalizedMimeType,
      });

      formData.append("image_file", blob, normalizedFilename);
      formData.append("size", "auto");

      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
        },
        body: formData,
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      // Retry only on rate limiting or server errors.
      const shouldRetry = response.status >= 500 || response.status === 429;
      const message = await response.text();
      if (!shouldRetry || attempt === maxAttempts - 1) {
        throw new Error(`remove.bg error: ${message}`);
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
  }

  throw new Error("remove.bg error: retry attempts exhausted");
};
