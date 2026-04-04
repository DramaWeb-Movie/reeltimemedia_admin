import { createLogger } from "@/lib/logger";

const log = createLogger("lib:upload:transcode");

type TranscodeKind = "single_movie" | "single_episode";

interface EnqueueTranscodeJobParams {
  kind: TranscodeKind;
  movieId: string;
  sourceKey: string;
  outputKeyPrefix: string;
  episodeId?: string;
  episodeNumber?: number;
}

export async function enqueueTranscodeJob(params: EnqueueTranscodeJobParams): Promise<void> {
  const serviceUrl = process.env.TRANSCODE_SERVICE_URL;
  const serviceSecret = process.env.TRANSCODE_SERVICE_SECRET;
  const sourceBucket = process.env.R2_BUCKET_NAME;

  if (!serviceUrl || !serviceSecret || !sourceBucket) {
    log.warn("Transcode enqueue skipped: missing required env vars", {
      hasServiceUrl: Boolean(serviceUrl),
      hasServiceSecret: Boolean(serviceSecret),
      hasSourceBucket: Boolean(sourceBucket),
    });
    return;
  }

  const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/transcode/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceSecret}`,
    },
    body: JSON.stringify({
      kind: params.kind,
      movie_id: params.movieId,
      episode_id: params.episodeId,
      episode_number: params.episodeNumber,
      source_bucket: sourceBucket,
      source_key: params.sourceKey,
      output_key_prefix: params.outputKeyPrefix,
      supabase_update: true,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Transcode enqueue failed (${response.status}): ${text}`);
  }
}
