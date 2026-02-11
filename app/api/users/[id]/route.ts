import { NextResponse } from "next/server";
import type { User } from "@/types";

const MOCK_USERS: Record<string, User> = {
  "1": {
    id: "1",
    email: "john.doe@example.com",
    full_name: "John Doe",
    subscription_type: "premium",
    subscription_status: "active",
    subscription_expires_at: "2025-03-15T00:00:00Z",
    created_at: "2024-01-10T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
  },
  "2": {
    id: "2",
    email: "jane.smith@example.com",
    full_name: "Jane Smith",
    subscription_type: "free",
    subscription_status: "none",
    subscription_expires_at: null,
    created_at: "2024-02-15T00:00:00Z",
    updated_at: "2024-02-15T00:00:00Z",
  },
  "3": {
    id: "3",
    email: "alex@example.com",
    full_name: "Alex Johnson",
    subscription_type: "lifetime",
    subscription_status: "active",
    subscription_expires_at: null,
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-03-01T00:00:00Z",
  },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = MOCK_USERS[id];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
