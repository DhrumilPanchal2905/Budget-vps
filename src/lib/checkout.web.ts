// Razorpay Checkout in the browser (same flow as before). The amount is decided by our server.
import { api } from "./api";
import { SITE_URL } from "./config";
import { verifyPayment } from "./checkout-verify";
import type { CheckoutResult, OrderResp, PaidPlan } from "./checkout-types";

/* eslint-disable @typescript-eslint/no-explicit-any */
let loading: Promise<boolean> | null = null;
function loadScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => {
      loading = null;
      resolve(false);
    };
    document.body.appendChild(s);
  });
  return loading;
}

export async function buyPlan(plan: PaidPlan): Promise<CheckoutResult> {
  const [ok, order] = await Promise.all([loadScript(), api<OrderResp>("/api/billing/order", { method: "POST", body: { plan } }).then((r) => r.data)]);
  if (!ok || !(window as any).Razorpay) return { status: "failed", message: "Couldn't load the payment window. Check your connection (or ad-blocker) and try again." };
  return new Promise<CheckoutResult>((resolve) => {
    let settled = false;
    const done = (r: CheckoutResult) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    const rzp = new (window as any).Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "Budget Pro",
      description: `${order.planName} plan — 1 month`,
      image: `${SITE_URL}/icon-512.png`,
      prefill: { name: order.prefill.name, email: order.prefill.email },
      notes: { plan: order.plan },
      theme: { color: "#3987e5" },
      retry: { enabled: true, max_count: 3 },
      modal: { confirm_close: true, ondismiss: () => done({ status: "cancelled", message: "Payment cancelled — no money was taken." }) },
      handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => done(await verifyPayment(resp)),
    });
    rzp.on("payment.failed", (resp: any) => console.warn("[checkout] payment failed", resp?.error?.description));
    rzp.open();
  });
}

/** Web always can buy (Razorpay). */
export const canBuyInApp = async () => true;
