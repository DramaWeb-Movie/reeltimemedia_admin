import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Config } from "./client";
import { getExtension } from "./mime";
import { movieStorageDir } from "@/lib/r2/storage-path";

const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

/**
 * Generate a presigned URL for direct upload to R2
 * This allows clients to upload large files directly to R2,
 * bypassing server body size limits.
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = PRESIGNED_URL_EXPIRY
): Promise<PresignedUrlResult> {
  const { client, bucket, publicUrl } = getR2Config();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  // Construct the public URL for the file
  const filePublicUrl = publicUrl
    ? `${publicUrl.replace(/\/$/, "")}/${key}`
    : key;

  return {
    uploadUrl,
    key,
    publicUrl: filePublicUrl,
  };
}

/**
 * Generate presigned URLs for movie upload (video, thumbnail, optional subtitle)
 */
export async function generateMovieUploadUrls(
  movieId: string,
  title: string,
  videoType: string,
  thumbnailType: string,
  subtitleFileName?: string
): Promise<{
  video: PresignedUrlResult;
  thumbnail: PresignedUrlResult;
  subtitle: PresignedUrlResult | null;
}> {
  const videoExt = getExtension(videoType, "mp4");
  const thumbnailExt = getExtension(thumbnailType, "jpg");
  const base = movieStorageDir(title, movieId);

  const videoKey = `${base}/video.${videoExt}`;
  const thumbnailKey = `${base}/thumbnail.${thumbnailExt}`;

  const [video, thumbnail] = await Promise.all([
    generatePresignedUploadUrl(videoKey, videoType),
    generatePresignedUploadUrl(thumbnailKey, thumbnailType),
  ]);

  let subtitle: PresignedUrlResult | null = null;
  if (subtitleFileName) {
    const subtitleExt = subtitleFileName.toLowerCase().endsWith(".srt") ? "srt" : "vtt";
    const subtitleKey = `${base}/subtitles/en.${subtitleExt}`;
    const contentType = subtitleExt === "vtt" ? "text/vtt" : "application/x-subrip";
    subtitle = await generatePresignedUploadUrl(subtitleKey, contentType);
  }

  return { video, thumbnail, subtitle };
}

