export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type PaymentMethod = "credit_card" | "paypal" | "bank_transfer" | "other";

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_id: string | null;
  description: string | null;
  created_at: string;
  user?: {
    email: string;
    full_name: string | null;
  };
}

export interface PaymentStats {
  totalRevenue: number;
  pendingAmount: number;
  completedCount: number;
  failedCount: number;
}
