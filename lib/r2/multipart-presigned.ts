import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Config } from "./client";
import { getExtension } from "./mime";
import { createLogger } from "@/lib/logger";
import { movieStorageDir } from "@/lib/r2/storage-path";

const log = createLogger("r2:multipart");

const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

export interface MultipartUploadInit {
  uploadId: string;
  key: string;
  bucket: string;
  publicUrl: string;
}

export interface PartPresignedUrl {
  partNumber: number;
  uploadUrl: string;
}

/**
 * Initialize a multipart upload and return the uploadId
 */
export async function initMultipartUpload(
  key: string,
  contentType: string
): Promise<MultipartUploadInit> {
  const { client, bucket, publicUrl } = getR2Config();

  const command = new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const response = await client.send(command);

  if (!response.UploadId) {
    throw new Error("Failed to initiate multipart upload");
  }

  const filePublicUrl = publicUrl
    ? `${publicUrl.replace(/\/$/, "")}/${key}`
    : key;

  return {
    uploadId: response.UploadId,
    key,
    bucket,
    publicUrl: filePublicUrl,
  };
}

/**
 * Generate presigned URLs for uploading parts
 */
export async function generatePartPresignedUrls(
  key: string,
  uploadId: string,
  totalParts: number,
  expiresIn: number = PRESIGNED_URL_EXPIRY
): Promise<PartPresignedUrl[]> {
  const { client, bucket } = getR2Config();

  // Generate presigned URLs for all parts in parallel
  const promises = Array.from({ length: totalParts }, async (_, i) => {
    const partNumber = i + 1;
    const command = new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    return { partNumber, uploadUrl };
  });

  const results = await Promise.all(promises);
  return results.sort((a, b) => a.partNumber - b.partNumber);
}

/**
 * Complete a multipart upload
 */
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { ETag: string; PartNumber: number }[]
): Promise<void> {
  const { client, bucket } = getR2Config();

  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
      },
    })
  );
}

/**
 * Abort a multipart upload (cleanup on failure)
 */
export async function abortMultipartUpload(
  key: string,
  uploadId: string
): Promise<void> {
  const { client, bucket } = getR2Config();

  try {
    await client.send(
      new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
      })
    );
  } catch (error) {
    log.error("Failed to abort multipart upload", error);
  }
}

/**
 * Initialize multipart upload for a movie video and generate all part URLs
 */
export async function initMovieVideoMultipartUpload(
  movieId: string,
  title: string,
  videoType: string,
  fileSize: number,
  partSize: number = 8 * 1024 * 1024 // 8MB chunks — keeps all parallel connections busy
): Promise<{
  upload: MultipartUploadInit;
  partUrls: PartPresignedUrl[];
  partSize: number;
  totalParts: number;
}> {
  const ext = getExtension(videoType, "mp4");
  const key = `${movieStorageDir(title, movieId)}/video.${ext}`;

  const totalParts = Math.ceil(fileSize / partSize);

  const upload = await initMultipartUpload(key, videoType);
  const partUrls = await generatePartPresignedUrls(key, upload.uploadId, totalParts);

  return {
    upload,
    partUrls,
    partSize,
    totalParts,
  };
}

/**
 * Initialize multipart upload for an episode video
 */
export async function initEpisodeVideoMultipartUpload(
  movieId: string,
  title: string,
  episodeNumber: number,
  videoType: string,
  fileSize: number,
  partSize: number = 8 * 1024 * 1024
): Promise<{
  upload: MultipartUploadInit;
  partUrls: PartPresignedUrl[];
  partSize: number;
  totalParts: number;
}> {
  const ext = getExtension(videoType, "mp4");
  const key = `${movieStorageDir(title, movieId)}/episodes/${episodeNumber}.${ext}`;

  const totalParts = Math.ceil(fileSize / partSize);

  const upload = await initMultipartUpload(key, videoType);
  const partUrls = await generatePartPresignedUrls(key, upload.uploadId, totalParts);

  return {
    upload,
    partUrls,
    partSize,
    totalParts,
  };
}
