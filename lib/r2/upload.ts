import {
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getR2Config } from "./client";
import {
  getExtension,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_IMAGE_TYPES,
  MAX_VIDEO_BYTES,
  MAX_IMAGE_BYTES,
} from "./mime";
import { createLogger } from "@/lib/logger";

const log = createLogger("r2:upload");

// Multipart upload settings
const PART_SIZE = 100 * 1024 * 1024; // 100MB per part (recommended for large files)
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // Use multipart for files > 100MB

/**
 * Upload a small file directly to R2 (< 100MB)
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const { client, bucket, publicUrl } = getR2Config();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  if (publicUrl) {
    const base = publicUrl.replace(/\/$/, "");
    return `${base}/${key}`;
  }
  return key;
}

/**
 * Upload a large file using multipart upload (for files > 100MB)
 * This streams the file in chunks to avoid memory issues
 */
export async function uploadLargeFileToR2(
  key: string,
  file: File,
  contentType: string
): Promise<string> {
  const { client, bucket, publicUrl } = getR2Config();

  // Start multipart upload
  const createResponse = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })
  );

  const uploadId = createResponse.UploadId;
  if (!uploadId) {
    throw new Error("Failed to initiate multipart upload");
  }

  const parts: { ETag: string; PartNumber: number }[] = [];
  const totalParts = Math.ceil(file.size / PART_SIZE);

  log.info("Starting multipart upload", { size: file.size, parts: totalParts });

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      
      // Slice the file to get only the current chunk
      const chunk = file.slice(start, end);
      const buffer = Buffer.from(await chunk.arrayBuffer());

      log.debug(`Uploading part`, { part: partNumber, of: totalParts, bytes: buffer.length });

      const uploadPartResponse = await client.send(
        new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: buffer,
        })
      );

      if (!uploadPartResponse.ETag) {
        throw new Error(`Failed to upload part ${partNumber}`);
      }

      parts.push({
        ETag: uploadPartResponse.ETag,
        PartNumber: partNumber,
      });
    }

    // Complete the multipart upload
    await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts,
        },
      })
    );

    log.info("Multipart upload completed", { key });

    if (publicUrl) {
      const base = publicUrl.replace(/\/$/, "");
      return `${base}/${key}`;
    }
    return key;
  } catch (error) {
    // Abort multipart upload on failure
    log.error("Multipart upload failed, aborting", error);
    try {
      await client.send(
        new AbortMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
        })
      );
    } catch (abortError) {
      log.error("Failed to abort multipart upload", abortError);
    }
    throw error;
  }
}

export async function uploadVideo(movieId: string, file: File): Promise<string> {
  const mime = file.type;
  if (!ALLOWED_VIDEO_TYPES.includes(mime)) {
    throw new Error(`Invalid video type. Allowed: ${ALLOWED_VIDEO_TYPES.join(", ")}`);
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`Video too large. Max ${MAX_VIDEO_BYTES / 1024 / 1024 / 1024}GB`);
  }
  
  const ext = getExtension(mime, "mp4");
  const key = `movies/${movieId}/video.${ext}`;

  // Use multipart upload for large files
  if (file.size > MULTIPART_THRESHOLD) {
    log.info("Using multipart upload for video", { size: file.size });
    return uploadLargeFileToR2(key, file, mime);
  }

  // Small files: load into memory
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadToR2(key, buffer, mime);
}

export async function uploadThumbnail(movieId: string, file: File): Promise<string> {
  const mime = file.type;
  if (!ALLOWED_IMAGE_TYPES.includes(mime)) {
    throw new Error(`Invalid image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Thumbnail too large. Max ${MAX_IMAGE_BYTES / 1024 / 1024}MB`);
  }
  const ext = getExtension(mime, "jpg");
  const key = `movies/${movieId}/thumbnail.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadToR2(key, buffer, mime);
}

export async function uploadSubtitle(movieId: string, file: File, lang = "en"): Promise<string> {
  const name = file.name.toLowerCase();
  const ext = name.endsWith(".vtt") ? "vtt" : name.endsWith(".srt") ? "srt" : "vtt";
  const key = `movies/${movieId}/subtitles/${lang}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = ext === "vtt" ? "text/vtt" : "application/x-subrip";
  return uploadToR2(key, buffer, contentType);
}

export async function uploadEpisodeVideo(
  movieId: string,
  episodeNumber: number,
  file: File
): Promise<string> {
  const mime = file.type;
  if (!ALLOWED_VIDEO_TYPES.includes(mime)) {
    throw new Error(`Invalid video type. Allowed: ${ALLOWED_VIDEO_TYPES.join(", ")}`);
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`Video too large. Max ${MAX_VIDEO_BYTES / 1024 / 1024 / 1024}GB`);
  }

  const ext = getExtension(mime, "mp4");
  const key = `movies/${movieId}/episodes/${episodeNumber}.${ext}`;

  // Use multipart upload for large files
  if (file.size > MULTIPART_THRESHOLD) {
    log.info("Using multipart upload for episode", { episode: episodeNumber, size: file.size });
    return uploadLargeFileToR2(key, file, mime);
  }

  // Small files: load into memory
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadToR2(key, buffer, mime);
}
