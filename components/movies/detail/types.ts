export interface SeriesEpisode {
  id: string;
  movie_id: string;
  episode_number: number;
  title: string;
  duration: number | null;
  video_url: string | null;
  encoding_status?: "pending" | "processing" | "ready" | "failed" | null;
  encoding_error?: string | null;
  hls_manifest_url?: string | null;
  is_free_preview: boolean;
  created_at: string;
}
