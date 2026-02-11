import { NextResponse } from "next/server";
import type { Payment } from "@/types";

const MOCK_PAYMENTS: Payment[] = [
  {
    id: "1",
    user_id: "1",
    amount: 29.99,
    currency: "USD",
    payment_method: "credit_card",
    payment_status: "completed",
    transaction_id: "txn_abc123",
    description: "Monthly subscription",
    created_at: "2024-02-10T14:30:00Z",
    user: { email: "john.doe@example.com", full_name: "John Doe" },
  },
  {
    id: "2",
    user_id: "2",
    amount: 9.99,
    currency: "USD",
    payment_method: "paypal",
    payment_status: "pending",
    transaction_id: null,
    description: "Single movie purchase",
    created_at: "2024-02-09T10:00:00Z",
    user: { email: "jane.smith@example.com", full_name: "Jane Smith" },
  },
  {
    id: "3",
    user_id: "3",
    amount: 199.99,
    currency: "USD",
    payment_method: "credit_card",
    payment_status: "completed",
    transaction_id: "txn_def456",
    description: "Lifetime subscription",
    created_at: "2024-02-08T16:45:00Z",
    user: { email: "alex@example.com", full_name: "Alex Johnson" },
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let filtered = [...MOCK_PAYMENTS];
    if (status) {
      filtered = filtered.filter((p) => p.payment_status === status);
    }

    return NextResponse.json({ payments: filtered });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
