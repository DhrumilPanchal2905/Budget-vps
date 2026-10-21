import { api } from "./api";
import type { CheckoutResult } from "./checkout-types";

/** After Razorpay says "paid": our server checks the signature + asks Razorpay before the plan changes. */
export async function verifyPayment(resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }): Promise<CheckoutResult> {
  try {
    const r = await api<{ ok: boolean; status: string; periodEnd?: string; message: string }>("/api/billing/verify", {
      method: "POST",
      body: { orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature },
      timeout: 45_000,
    });
    return { status: r.data.status === "paid" ? "paid" : "pending", message: r.data.message, periodEnd: r.data.periodEnd };
  } catch (e) {
    const status = (e as { status?: number }).status;
    // 400 = the server checked with Razorpay and the payment is NOT valid; anything else = still confirming
    if (status === 400) return { status: "failed", message: (e as Error).message };
    return { status: "pending", message: (e as Error).message || "Payment received — confirming. Your plan will activate in a few minutes." };
  }
}
