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
 * Generate presigned URLs for movie upload (video, four responsive artwork images, optional subtitle)
 */
export async function generateMovieUploadUrls(
  movieId: string,
  title: string,
  videoType: string,
  thumbnailPhoneType: string,
  thumbnailLaptopType: string,
  coverPhoneType: string,
  coverLaptopType: string,
  subtitleFileName?: string
): Promise<{
  video: PresignedUrlResult;
  thumbnailPhone: PresignedUrlResult;
  thumbnailLaptop: PresignedUrlResult;
  coverPhone: PresignedUrlResult;
  coverLaptop: PresignedUrlResult;
  subtitle: PresignedUrlResult | null;
}> {
  const videoExt = getExtension(videoType, "mp4");
  const base = movieStorageDir(title, movieId);

  const videoKey = `${base}/video.${videoExt}`;
  const tpExt = getExtension(thumbnailPhoneType, "jpg");
  const tlExt = getExtension(thumbnailLaptopType, "jpg");
  const cpExt = getExtension(coverPhoneType, "jpg");
  const clExt = getExtension(coverLaptopType, "jpg");

  const thumbnailPhoneKey = `${base}/thumbnail-phone.${tpExt}`;
  const thumbnailLaptopKey = `${base}/thumbnail-laptop.${tlExt}`;
  const coverPhoneKey = `${base}/cover-phone.${cpExt}`;
  const coverLaptopKey = `${base}/cover-laptop.${clExt}`;

  const [video, thumbnailPhone, thumbnailLaptop, coverPhone, coverLaptop] = await Promise.all([
    generatePresignedUploadUrl(videoKey, videoType),
    generatePresignedUploadUrl(thumbnailPhoneKey, thumbnailPhoneType),
    generatePresignedUploadUrl(thumbnailLaptopKey, thumbnailLaptopType),
    generatePresignedUploadUrl(coverPhoneKey, coverPhoneType),
    generatePresignedUploadUrl(coverLaptopKey, coverLaptopType),
  ]);

  let subtitle: PresignedUrlResult | null = null;
  if (subtitleFileName) {
    const subtitleExt = subtitleFileName.toLowerCase().endsWith(".srt") ? "srt" : "vtt";
    const subtitleKey = `${base}/subtitles/en.${subtitleExt}`;
    const contentType = subtitleExt === "vtt" ? "text/vtt" : "application/x-subrip";
    subtitle = await generatePresignedUploadUrl(subtitleKey, contentType);
  }

  return { video, thumbnailPhone, thumbnailLaptop, coverPhone, coverLaptop, subtitle };
}
