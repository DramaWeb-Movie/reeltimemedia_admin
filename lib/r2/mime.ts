const EXTENSION_MAP: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function getExtension(mime: string, fallback: string): string {
  return EXTENSION_MAP[mime] ?? fallback;
}

export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** 5 GB */
export const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;
/** 10 MB */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
