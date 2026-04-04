export type MovieStatus = "draft" | "published" | "archived";

export type MovieType = "series" | "single";

export interface Movie {
  id: string;
  title: string;
  title_kh: string | null;
  description: string | null;
  genre: string | null;
  release_date: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  video_url: string | null;
  status: MovieStatus;
  type: MovieType;
  /** Price in USD for single movies (one-time purchase, e.g. $2–3) */
  price: number | null;
  /** Number of free/preview episodes for series (admin can set 2–3) */
  free_episodes_count: number | null;
  /** Subscription plan ID required for series (null for single) */
  subscription_plan_id: string | null;
  /** Total episodes for series (null for single) */
  total_episodes: number | null;
  /** Cast/actors - comma-separated */
  cast?: string | null;
  trailer_url?: string | null;
  encoding_status?: "pending" | "processing" | "ready" | "failed" | null;
  encoding_error?: string | null;
  hls_manifest_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EpisodeInput {
  id: string;
  episodeNumber: number;
  title: string;
  videoFile: File | null;
  duration: string;
  /** When series requires membership: mark which episodes are free to preview */
  isFreePreview?: boolean;
}

export interface MovieFormData {
  title: string;
  title_kh: string;
  description: string;
  genre: string;
  release_date: string;
  duration: string;
  status: MovieStatus;
  type: MovieType;
  price: string;
  free_episodes_count: string;
  subscription_plan_id: string;
  total_episodes: string;
  episodes: EpisodeInput[];
}
