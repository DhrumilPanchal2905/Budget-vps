// Native payment sheet: Razorpay Checkout inside a WebView. Opened by lib/checkout.ts → buyPlan().
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { on } from "@/lib/events";
import { SITE_URL } from "@/lib/config";
import { verifyPayment } from "@/lib/checkout-verify";
import type { CheckoutResult, OrderResp } from "@/lib/checkout-types";
import { Text, useTheme } from "@/ui";

interface Pending {
  order: OrderResp;
  resolve: (r: CheckoutResult) => void;
}

function html(o: OrderResp): string {
  const opts = {
    key: o.keyId,
    order_id: o.orderId,
    amount: o.amount,
    currency: o.currency,
    name: "Budget Pro",
    description: `${o.planName} plan — 1 month`,
    image: `${SITE_URL}/icon-512.png`,
    prefill: { name: o.prefill.name, email: o.prefill.email },
    notes: { plan: o.plan },
    theme: { color: "#3987e5", backdrop_color: "#000000" },
    retry: { enabled: true, max_count: 3 },
  };
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#000;height:100%}</style></head>
<body><script src="https://checkout.razorpay.com/v1/checkout.js"></script><script>
(function(){
  var post=function(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));};
  var o=${JSON.stringify(opts).replace(/</g, "\\u003c")};
  o.handler=function(r){post({type:"paid",r:r});};
  o.modal={confirm_close:true,ondismiss:function(){post({type:"dismiss"});}};
  try{var rzp=new Razorpay(o);rzp.on("payment.failed",function(e){post({type:"failed",msg:(e&&e.error&&e.error.description)||""});});rzp.open();}
  catch(e){post({type:"error",msg:String(e&&e.message||e)});}
})();
</script></body></html>`;
}

export function CheckoutHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<Pending | null>(null);
  const [verifying, setVerifying] = useState(false);
  const settled = useRef(false);

  useEffect(
    () =>
      on("checkout:open", (p) => {
        settled.current = false;
        setVerifying(false);
        setPending(p as Pending);
      }),
    [],
  );

  const finish = (r: CheckoutResult) => {
    if (settled.current || !pending) return;
    settled.current = true;
    pending.resolve(r);
    setPending(null);
  };
  // closing while the server confirms a payment must not report "cancelled" (the money may already be taken)
  const cancel = () => {
    if (verifying) return;
    finish({ status: "cancelled", message: "Payment cancelled — no money was taken." });
  };

  const onMessage = async (e: WebViewMessageEvent) => {
    let m: { type: string; r?: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }; msg?: string };
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (m.type === "paid" && m.r) {
      setVerifying(true);
      finish(await verifyPayment(m.r));
    } else if (m.type === "dismiss") finish({ status: "cancelled", message: "Payment cancelled — no money was taken." });
    else if (m.type === "error") finish({ status: "failed", message: "Couldn't load the payment window. Check your connection and try again." });
    // "failed": Razorpay lets the buyer retry inside the window
  };

  return (
    <Modal visible={!!pending} animationType="slide" onRequestClose={cancel}>
      <View style={{ flex: 1, backgroundColor: "#000", paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.c.border, backgroundColor: t.c.surface }}>
          <Text size="sm" weight="semibold">
            Secure payment · Razorpay
          </Text>
          <Pressable accessibilityLabel="Close payment" hitSlop={10} onPress={cancel} disabled={verifying}>
            <X size={20} color={t.c.muted} />
          </Pressable>
        </View>
        {pending ? (
          <WebView
            source={{ html: html(pending.order), baseUrl: SITE_URL }}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            onMessage={onMessage}
            startInLoadingState
            renderLoading={() => (
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            onShouldStartLoadWithRequest={(req) => {
              // UPI apps, bank apps, intent:// links → open outside the WebView
              if (/^(https?|about|data|blob):/i.test(req.url)) return true;
              // Android intent://…#Intent;scheme=upi;package=…;S.browser_fallback_url=…;end → open the target app
              if (/^intent:/i.test(req.url)) {
                const scheme = /;scheme=([^;]+)/.exec(req.url)?.[1];
                const fallback = /;S\.browser_fallback_url=([^;]+)/.exec(req.url)?.[1];
                const target = scheme ? `${scheme}:${req.url.slice("intent:".length).split("#Intent")[0]}` : null;
                void (target ? Linking.openURL(target) : Promise.reject(new Error("no scheme"))).catch(() => (fallback ? Linking.openURL(decodeURIComponent(fallback)) : null)).catch(() => null);
                return false;
              }
              void Linking.openURL(req.url).catch(() => null);
              return false;
            }}
          />
        ) : null}
        {verifying ? (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.75)", gap: 12 }}>
            <ActivityIndicator color="#fff" />
            <Text size="sm" color="white">
              Confirming your payment…
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
