// Razorpay in the Android / iOS app: the official Razorpay Checkout runs inside a secure in-app WebView
// (components/checkout-host.tsx). UPI apps (GPay / PhonePe / Paytm) open directly. Our server creates the order
// and verifies the payment exactly like on the web.
import { Platform } from "react-native";
import { api } from "./api";
import { emit } from "./events";
import { getAppConfig } from "./app-config";
import type { CheckoutResult, OrderResp, PaidPlan } from "./checkout-types";

export async function buyPlan(plan: PaidPlan): Promise<CheckoutResult> {
  const { data: order } = await api<OrderResp>("/api/billing/order", { method: "POST", body: { plan } });
  return new Promise<CheckoutResult>((resolve) => emit("checkout:open", { order, resolve }));
}

/**
 * Store rules: Apple requires In-App Purchase for digital subscriptions bought inside an iOS app, so buying is
 * switched off on iOS by default (PAYMENTS_ON_IOS on the server). Android uses PAYMENTS_ON_ANDROID.
 */
export async function canBuyInApp(): Promise<boolean> {
  try {
    const cfg = await getAppConfig();
    return Platform.OS === "ios" ? cfg.payments.ios : cfg.payments.android;
  } catch {
    return Platform.OS !== "ios";
  }
}

export type { OrderResp };
