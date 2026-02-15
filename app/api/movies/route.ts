import { NextResponse } from "next/server";
import type { Movie } from "@/types";

const MOCK_MOVIES: Movie[] = [
  {
    id: "1",
    title: "Midnight Drama",
    description: "A gripping tale of love and betrayal in the city.",
    genre: "Drama",
    release_date: "2024-01-15",
    duration: 120,
    thumbnail_url: null,
    video_url: null,
    subtitle_url: null,
    status: "published",
    type: "single",
    price: 2.99,
    free_episodes_count: null,
    subscription_plan_id: null,
    total_episodes: null,
    created_at: "2024-01-10T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "2",
    title: "Eternal Love",
    description: "A romance that transcends time.",
    genre: "Romance",
    release_date: "2024-02-01",
    duration: 95,
    thumbnail_url: null,
    video_url: null,
    subtitle_url: null,
    status: "published",
    type: "single",
    price: 2.49,
    free_episodes_count: null,
    subscription_plan_id: null,
    total_episodes: null,
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
  },
  {
    id: "3",
    title: "Shadow of the Past",
    description: "Uncover the secrets that haunt a family.",
    genre: "Thriller",
    release_date: "2024-03-10",
    duration: 110,
    thumbnail_url: null,
    video_url: null,
    subtitle_url: null,
    status: "draft",
    type: "series",
    price: null,
    free_episodes_count: 3,
    subscription_plan_id: "1",
    total_episodes: 12,
    created_at: "2024-02-15T00:00:00Z",
    updated_at: "2024-02-20T00:00:00Z",
  },
  {
    id: "4",
    title: "City Lights",
    description: "Life in the fast lane.",
    genre: "Drama",
    release_date: "2024-04-05",
    duration: 88,
    thumbnail_url: null,
    video_url: null,
    subtitle_url: null,
    status: "archived",
    type: "single",
    price: 2.99,
    free_episodes_count: null,
    subscription_plan_id: null,
    total_episodes: null,
    created_at: "2023-12-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search")?.toLowerCase();

    let filtered = [...MOCK_MOVIES];
    if (status) {
      filtered = filtered.filter((m) => m.status === status);
    }
    if (type) {
      filtered = filtered.filter((m) => m.type === type);
    }
    if (search) {
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(search) ||
          (m.genre?.toLowerCase().includes(search) ?? false)
      );
    }

    return NextResponse.json({ movies: filtered });
  } catch {
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}
