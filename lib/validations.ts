/**
 * Shared validation helpers for API routes.
 * Returns an error message string on failure, or null on success.
 */

import { isR2KeyForMovie } from "@/lib/r2/storage-path";

export type ValidationResult = string | null;

export function validateTitle(title: unknown): ValidationResult {
  if (!title || typeof title !== "string" || !title.trim()) {
    return "Title is required";
  }
  if (title.trim().length > 255) {
    return "Title must be 255 characters or fewer";
  }
  return null;
}

export function validateStatus(status: unknown): ValidationResult {
  if (!status || !["draft", "published", "archived"].includes(status as string)) {
    return "Status must be draft, published, or archived";
  }
  return null;
}

export function validateFinalStatus(status: unknown): ValidationResult {
  if (!status || !["draft", "published"].includes(status as string)) {
    return "Status must be draft or published";
  }
  return null;
}

export function validateMovieId(id: unknown): ValidationResult {
  if (!id || typeof id !== "string" || !id.trim()) {
    return "movieId is required";
  }
  return null;
}

export function validateFilePresent(file: File | null | undefined, fieldName: string): ValidationResult {
  if (!file || file.size === 0) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateVideoAndThumbnail(
  videoFile: File | null | undefined,
  thumbnailFile: File | null | undefined
): ValidationResult {
  return (
    validateFilePresent(videoFile, "Video") ??
    validateFilePresent(thumbnailFile, "Thumbnail")
  );
}

export function validateVideoThumbnailAndCover(
  videoFile: File | null | undefined,
  thumbnailFile: File | null | undefined,
  coverFile: File | null | undefined
): ValidationResult {
  return (
    validateFilePresent(videoFile, "Video") ??
    validateFilePresent(thumbnailFile, "Thumbnail") ??
    validateFilePresent(coverFile, "List cover image")
  );
}

export function validateVideoAndFourArtwork(
  videoFile: File | null | undefined,
  thumbnailPhone: File | null | undefined,
  thumbnailLaptop: File | null | undefined,
  coverPhone: File | null | undefined,
  coverLaptop: File | null | undefined
): ValidationResult {
  return (
    validateFilePresent(videoFile, "Video") ??
    validateFilePresent(thumbnailPhone, "Thumbnail (phone)") ??
    validateFilePresent(thumbnailLaptop, "Thumbnail (laptop)") ??
    validateFilePresent(coverPhone, "Movie cover (phone)") ??
    validateFilePresent(coverLaptop, "Movie cover (laptop)")
  );
}

/**
 * Validate multipart upload completion fields.
 * Returns an error string or null.
 */
export function validateMultipartComplete(body: {
  movieId?: unknown;
  uploadId?: unknown;
  key?: unknown;
  thumbnailPhoneKey?: unknown;
  thumbnailLaptopKey?: unknown;
  coverPhoneKey?: unknown;
  coverLaptopKey?: unknown;
  parts?: unknown;
}): ValidationResult {
  const { movieId, uploadId, key, thumbnailPhoneKey, thumbnailLaptopKey, coverPhoneKey, coverLaptopKey, parts } = body;
  if (
    !movieId ||
    !uploadId ||
    !key ||
    !thumbnailPhoneKey ||
    !thumbnailLaptopKey ||
    !coverPhoneKey ||
    !coverLaptopKey
  ) {
    return "Missing required fields";
  }
  if (!Array.isArray(parts) || parts.length === 0) {
    return "parts must be a non-empty array";
  }
  return null;
}

/**
 * Validate that an R2 key belongs to the expected movie to prevent path traversal.
 */
export function validateKeyBelongsToMovie(key: string, movieId: string): ValidationResult {
  if (!isR2KeyForMovie(key, movieId)) {
    return "Invalid key: does not belong to this movie";
  }
  return null;
}
