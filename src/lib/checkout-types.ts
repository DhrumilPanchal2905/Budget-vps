export interface OrderResp {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  plan: string;
  planName: string;
  mode: "new" | "renew" | "upgrade";
  creditDays: number;
  periodEnd: string;
  prefill: { name: string; email: string };
}

export interface CheckoutResult {
  status: "paid" | "pending" | "cancelled" | "failed";
  message: string;
  periodEnd?: string;
}

export type PaidPlan = "plus" | "pro" | "unlimited";
