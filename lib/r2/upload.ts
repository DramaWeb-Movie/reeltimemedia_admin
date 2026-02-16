import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Config } from "./client";

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE ?? 52_428_800); // 50MB default
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

export async function uploadVideo(movieId: string, file: File): Promise<string> {
  const mime = file.type;
  if (!ALLOWED_VIDEO.some((t) => mime === t || mime.startsWith(t.split("/")[0] + "/"))) {
    throw new Error(`Invalid video type. Allowed: ${ALLOWED_VIDEO.join(", ")}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Video too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  const ext = getExtension(mime, "mp4");
  const key = `movies/${movieId}/video.${ext}`;
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
