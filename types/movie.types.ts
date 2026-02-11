export type MovieStatus = "draft" | "published" | "archived";

export interface Movie {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  release_date: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  video_url: string | null;
  subtitle_url: string | null;
  status: MovieStatus;
  created_at: string;
  updated_at: string;
}

export interface MovieFormData {
  title: string;
  description: string;
  genre: string;
  release_date: string;
  duration: string;
  status: MovieStatus;
}
