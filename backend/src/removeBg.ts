// remove.bg integration with retries.
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

export const removeBackground = async (
  imageBuffer: Buffer,
  filename: string
): Promise<Buffer> => {
  const apiKey = getEnvOrThrow("REMOVE_BG_API_KEY");
  // Retry on transient remove.bg failures.
  const maxAttempts = 3;
  const baseDelayMs = 400;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(imageBuffer)]);

      formData.append("image_file", blob, filename);
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
