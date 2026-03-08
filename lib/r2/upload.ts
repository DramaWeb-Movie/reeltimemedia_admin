import {
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getR2Config } from "./client";

// 5GB max for videos (adjust as needed)
const MAX_VIDEO_SIZE = Number(process.env.MAX_VIDEO_SIZE ?? 5_368_709_120); // 5GB default
const MAX_IMAGE_SIZE = Number(process.env.MAX_IMAGE_SIZE ?? 10_485_760); // 10MB default

// Multipart upload settings
const PART_SIZE = 100 * 1024 * 1024; // 100MB per part (recommended for large files)
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // Use multipart for files > 100MB

const ALLOWED_VIDEO = (process.env.ALLOWED_VIDEO_TYPES ?? "video/mp4,video/webm,video/quicktime").split(",").map((t) => t.trim());
const ALLOWED_IMAGE = (process.env.ALLOWED_IMAGE_TYPES ?? "image/jpeg,image/png,image/webp").split(",").map((t) => t.trim());

function getExtension(mime: string, fallback: string): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[mime] ?? fallback;
}

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

  console.log(`Starting multipart upload: ${file.size} bytes, ${totalParts} parts`);

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      
      // Slice the file to get only the current chunk
      const chunk = file.slice(start, end);
      const buffer = Buffer.from(await chunk.arrayBuffer());

      console.log(`Uploading part ${partNumber}/${totalParts} (${buffer.length} bytes)`);

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

    console.log(`Multipart upload completed: ${key}`);

    if (publicUrl) {
      const base = publicUrl.replace(/\/$/, "");
      return `${base}/${key}`;
    }
    return key;
  } catch (error) {
    // Abort multipart upload on failure
    console.error("Multipart upload failed, aborting...", error);
    try {
      await client.send(
        new AbortMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
        })
      );
    } catch (abortError) {
      console.error("Failed to abort multipart upload:", abortError);
    }
    throw error;
  }
}

export async function uploadVideo(movieId: string, file: File): Promise<string> {
  const mime = file.type;
  if (!ALLOWED_VIDEO.some((t) => mime === t || mime.startsWith(t.split("/")[0] + "/"))) {
    throw new Error(`Invalid video type. Allowed: ${ALLOWED_VIDEO.join(", ")}`);
  }
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error(`Video too large. Max ${MAX_VIDEO_SIZE / 1024 / 1024 / 1024}GB`);
  }
  
  const ext = getExtension(mime, "mp4");
  const key = `movies/${movieId}/video.${ext}`;

  // Use multipart upload for large files
  if (file.size > MULTIPART_THRESHOLD) {
    console.log(`Using multipart upload for ${file.size} bytes video`);
    return uploadLargeFileToR2(key, file, mime);
  }

  // Small files: load into memory
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadToR2(key, buffer, mime);
}

export async function uploadThumbnail(movieId: string, file: File): Promise<string> {
  const mime = file.type;
  if (!ALLOWED_IMAGE.some((t) => mime === t || mime.startsWith(t.split("/")[0] + "/"))) {
    throw new Error(`Invalid image type. Allowed: ${ALLOWED_IMAGE.join(", ")}`);
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
  if (!ALLOWED_VIDEO.some((t) => mime === t || mime.startsWith(t.split("/")[0] + "/"))) {
    throw new Error(`Invalid video type. Allowed: ${ALLOWED_VIDEO.join(", ")}`);
  }
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error(`Video too large. Max ${MAX_VIDEO_SIZE / 1024 / 1024 / 1024}GB`);
  }
  
  const ext = getExtension(mime, "mp4");
  const key = `movies/${movieId}/episodes/${episodeNumber}.${ext}`;

  // Use multipart upload for large files
  if (file.size > MULTIPART_THRESHOLD) {
    console.log(`Using multipart upload for episode ${episodeNumber}: ${file.size} bytes`);
    return uploadLargeFileToR2(key, file, mime);
  }

  // Small files: load into memory
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadToR2(key, buffer, mime);
}
