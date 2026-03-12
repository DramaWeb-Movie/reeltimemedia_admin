/**
 * Parallel chunk uploader for fast large file uploads to R2
 * Uploads multiple chunks simultaneously for 5-10x speed improvement
 */

import { createLogger } from "@/lib/logger";

const log = createLogger("uploader");

export interface PartUrl {
  partNumber: number;
  uploadUrl: string;
}

export interface UploadProgress {
  totalBytes: number;
  uploadedBytes: number;
  percentage: number;
  currentParts: number;
  totalParts: number;
  speed: number; // bytes per second (rolling window)
  eta: number; // seconds remaining
}

export interface CompletedPart {
  ETag: string;
  PartNumber: number;
}

export interface ParallelUploadOptions {
  file: File;
  partUrls: PartUrl[];
  partSize: number;
  concurrency?: number;
  maxRetries?: number;
  onProgress?: (progress: UploadProgress) => void;
  onPartComplete?: (part: CompletedPart) => void;
  abortSignal?: AbortSignal;
}

export interface ParallelUploadResult {
  parts: CompletedPart[];
  totalTime: number;
  averageSpeed: number;
}

// Rolling window to smooth out speed calculation
const SPEED_WINDOW_MS = 4000;

interface SpeedSample {
  time: number;
  bytes: number;
}

/**
 * Upload a file in parallel chunks with automatic retry on failure
 */
export async function uploadFileInParallel(
  options: ParallelUploadOptions
): Promise<ParallelUploadResult> {
  const {
    file,
    partUrls,
    partSize,
    concurrency = 8,
    maxRetries = 3,
    onProgress,
    onPartComplete,
    abortSignal,
  } = options;

  const startTime = Date.now();
  const completedParts: CompletedPart[] = [];
  const partProgress = new Map<number, number>();
  const speedSamples: SpeedSample[] = [];

  partUrls.forEach((p) => partProgress.set(p.partNumber, 0));

  const updateProgress = () => {
    let uploadedBytes = 0;
    partProgress.forEach((bytes) => { uploadedBytes += bytes; });

    const now = Date.now();

    // Add sample for rolling window
    speedSamples.push({ time: now, bytes: uploadedBytes });

    // Prune samples older than the window
    const cutoff = now - SPEED_WINDOW_MS;
    while (speedSamples.length > 1 && speedSamples[0].time < cutoff) {
      speedSamples.shift();
    }

    // Rolling speed: delta bytes / delta time over the window
    let speed = 0;
    if (speedSamples.length >= 2) {
      const oldest = speedSamples[0];
      const newest = speedSamples[speedSamples.length - 1];
      const deltaTime = (newest.time - oldest.time) / 1000;
      const deltaBytes = newest.bytes - oldest.bytes;
      speed = deltaTime > 0 ? deltaBytes / deltaTime : 0;
    } else {
      const elapsed = (now - startTime) / 1000;
      speed = elapsed > 0 ? uploadedBytes / elapsed : 0;
    }

    const remaining = file.size - uploadedBytes;
    const eta = speed > 0 ? remaining / speed : 0;

    onProgress?.({
      totalBytes: file.size,
      uploadedBytes,
      percentage: Math.min(99, Math.round((uploadedBytes / file.size) * 100)),
      currentParts: completedParts.length,
      totalParts: partUrls.length,
      speed,
      eta,
    });
  };

  const uploadPart = async (partUrl: PartUrl): Promise<CompletedPart> => {
    const { partNumber, uploadUrl } = partUrl;
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, file.size);
    const chunk = file.slice(start, end);

    let attempt = 0;
    while (true) {
      attempt++;
      try {
        const part = await uploadChunkXHR(
          chunk,
          partNumber,
          uploadUrl,
          abortSignal,
          (loaded) => {
            partProgress.set(partNumber, loaded);
            updateProgress();
          }
        );
        partProgress.set(partNumber, chunk.size);
        completedParts.push(part);
        onPartComplete?.(part);
        updateProgress();
        return part;
      } catch (err) {
        const isAbort =
          err instanceof Error &&
          (err.message.includes("aborted") || err.message.includes("abort"));

        if (isAbort || attempt >= maxRetries) throw err;

        // Exponential backoff before retry: 500ms, 1000ms, 2000ms
        const delay = 500 * Math.pow(2, attempt - 1);
        log.warn("Chunk failed, retrying", { part: partNumber, attempt, delayMs: delay });
        await sleep(delay);

        // Reset this chunk's progress before retrying
        partProgress.set(partNumber, 0);
      }
    }
  };

  // Process uploads with limited concurrency
  const queue = [...partUrls];
  const inFlight: Promise<CompletedPart>[] = [];

  while (queue.length > 0 || inFlight.length > 0) {
    if (abortSignal?.aborted) throw new Error("Upload aborted");

    while (queue.length > 0 && inFlight.length < concurrency) {
      const partUrl = queue.shift()!;
      const promise = uploadPart(partUrl).finally(() => {
        const index = inFlight.indexOf(promise);
        if (index > -1) inFlight.splice(index, 1);
      });
      inFlight.push(promise);
    }

    if (inFlight.length > 0) {
      await Promise.race(inFlight);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  const averageSpeed = file.size / totalTime;

  onProgress?.({
    totalBytes: file.size,
    uploadedBytes: file.size,
    percentage: 100,
    currentParts: completedParts.length,
    totalParts: partUrls.length,
    speed: averageSpeed,
    eta: 0,
  });

  return {
    parts: completedParts.sort((a, b) => a.PartNumber - b.PartNumber),
    totalTime,
    averageSpeed,
  };
}

function uploadChunkXHR(
  chunk: Blob,
  partNumber: number,
  uploadUrl: string,
  abortSignal: AbortSignal | undefined,
  onProgress: (loaded: number) => void
): Promise<CompletedPart> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag") || `"part-${partNumber}"`;
        resolve({ ETag: etag, PartNumber: partNumber });
      } else {
        reject(new Error(`Part ${partNumber} failed: HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error(`Part ${partNumber} network error`))
    );
    xhr.addEventListener("abort", () =>
      reject(new Error(`Part ${partNumber} aborted`))
    );

    if (abortSignal) {
      abortSignal.addEventListener("abort", () => xhr.abort());
    }

    xhr.send(chunk);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}
