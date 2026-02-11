import { NextResponse } from "next/server";
import type { User } from "@/types";

const MOCK_USERS: User[] = [
  {
    id: "1",
    email: "john.doe@example.com",
    full_name: "John Doe",
    subscription_type: "premium",
    subscription_status: "active",
    subscription_expires_at: "2025-03-15T00:00:00Z",
    created_at: "2024-01-10T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
  },
  {
    id: "2",
    email: "jane.smith@example.com",
    full_name: "Jane Smith",
    subscription_type: "free",
    subscription_status: "none",
    subscription_expires_at: null,
    created_at: "2024-02-15T00:00:00Z",
    updated_at: "2024-02-15T00:00:00Z",
  },
  {
    id: "3",
    email: "alex@example.com",
    full_name: "Alex Johnson",
    subscription_type: "lifetime",
    subscription_status: "active",
    subscription_expires_at: null,
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-03-01T00:00:00Z",
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase();
    const subscription = searchParams.get("subscription");

    let filtered = [...MOCK_USERS];
    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          (u.full_name?.toLowerCase().includes(search) ?? false)
      );
    }
    if (subscription) {
      filtered = filtered.filter((u) => u.subscription_type === subscription);
    }

    return NextResponse.json({ users: filtered });
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
