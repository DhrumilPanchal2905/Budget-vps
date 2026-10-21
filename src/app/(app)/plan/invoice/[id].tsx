import { useEffect } from "react";
import { Platform, Pressable, Share, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import useSWR from "swr";
import { ArrowLeft, Printer, Share2 } from "lucide-react-native";
import { Button, ErrorState, Grid, Screen, Skeleton, Text, useTheme, useToast } from "@/ui";

interface Invoice {
  invoiceNo: string;
  date: string;
  status: string;
  customer: { name: string; email: string };
  seller: { name: string; owner: string; email: string; phone: string; address: string; gstin: string | null };
  item: { description: string; periodStart: string; periodEnd: string; creditDays: number };
  amount: number;
  currency: string;
  paymentId: string;
  orderId: string;
  method: string | null;
}

const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Web print: hide the app frame, print only the invoice in black on white.
const PRINT_CSS = `@media print { body * { visibility: hidden !important; } #bp-invoice, #bp-invoice * { visibility: visible !important; } #bp-invoice { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: #fff !important; border: 0 !important; } #bp-invoice * { color: #000 !important; border-color: #ccc !important; } }`;

function summary(inv: Invoice): string {
  return [
    `${inv.status === "refunded" ? "Invoice (refunded)" : "Invoice"} ${inv.invoiceNo}`,
    `Date: ${fmt(inv.date)}`,
    "",
    `From: ${inv.seller.name} (${inv.seller.owner})`,
    inv.seller.address,
    inv.seller.email + (inv.seller.phone ? ` · ${inv.seller.phone}` : ""),
    inv.seller.gstin ? `GSTIN: ${inv.seller.gstin}` : "Not registered under GST — no GST charged.",
    "",
    `Billed to: ${inv.customer.name} <${inv.customer.email}>`,
    "",
    inv.item.description,
    inv.item.periodStart ? `Service period ${fmt(inv.item.periodStart)} – ${fmt(inv.item.periodEnd)}${inv.item.creditDays ? ` (includes ${inv.item.creditDays} days carried over)` : ""}` : "",
    `Total paid: ${inr(inv.amount)}`,
    "",
    `Payment ID: ${inv.paymentId}`,
    `Order ID: ${inv.orderId}`,
    `Method: ${inv.method ? inv.method.toUpperCase() : "—"} (via Razorpay)`,
    `Status: ${inv.status === "paid" ? "Paid" : inv.status}`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
}

export default function InvoicePage() {
  const t = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: inv, error, isLoading, mutate } = useSWR<Invoice>(id ? `/api/billing/invoice/${id}` : null);
  const web = Platform.OS === "web";

  useEffect(() => {
    if (!web || typeof document === "undefined") return;
    const el = document.createElement("style");
    el.textContent = PRINT_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, [web]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/plan" as never));

  const action = async () => {
    if (!inv) return;
    if (web) {
      window.print();
      return;
    }
    try {
      await Share.share({ message: summary(inv), title: `Budget Pro invoice ${inv.invoiceNo}` });
    } catch (e) {
      toast.error("Could not share", (e as Error).message);
    }
  };

  return (
    <Screen onRefresh={() => void mutate()} refreshing={false} maxWidth={860}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Pressable accessibilityRole="link" onPress={back} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={16} color={t.c.muted} />
          <Text size="sm" color="muted">
            Plan & billing
          </Text>
        </Pressable>
        {inv ? (
          <Button variant="secondary" icon={web ? Printer : Share2} onPress={() => void action()}>
            {web ? "Print / Save PDF" : "Share"}
          </Button>
        ) : null}
      </View>
      {error ? (
        <ErrorState message={error.message} onRetry={() => mutate()} />
      ) : isLoading || !inv ? (
        <Skeleton height={520} />
      ) : (
        <View
          // becomes id="bp-invoice" on the web (used by the print stylesheet)
          nativeID="bp-invoice"
          style={{ borderRadius: 16, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface, padding: 24 }}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 20 }}>
            <View style={{ flexShrink: 1, minWidth: 200 }}>
              <Text size="xl" weight="bold">
                {inv.seller.name}
              </Text>
              <Text size="sm" color="muted" style={{ marginTop: 4 }}>
                {inv.seller.owner}
                {"\n"}
                {inv.seller.address}
                {"\n"}
                {inv.seller.email}
                {inv.seller.phone ? ` · ${inv.seller.phone}` : ""}
              </Text>
              <Text size="xs" color="muted" style={{ marginTop: 4 }}>
                {inv.seller.gstin ? `GSTIN: ${inv.seller.gstin}` : "Not registered under GST — no GST charged."}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text size="2xl" weight="semibold" tight>
                {inv.status === "refunded" ? "Invoice (refunded)" : "Invoice"}
              </Text>
              <Text size="sm" style={{ marginTop: 4 }}>
                <Text size="sm" color="muted">
                  No.{" "}
                </Text>
                {inv.invoiceNo}
              </Text>
              <Text size="sm">
                <Text size="sm" color="muted">
                  Date{" "}
                </Text>
                {fmt(inv.date)}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 28 }}>
            <Text size="xs" color="muted" uppercase>
              Billed to
            </Text>
            <Text size="base" weight="medium" style={{ marginTop: 4 }}>
              {inv.customer.name}
            </Text>
            <Text size="sm" color="muted">
              {inv.customer.email}
            </Text>
          </View>

          <View style={{ marginTop: 28 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.c.border }}>
              <Text size="sm" weight="medium">
                Description
              </Text>
              <Text size="sm" weight="medium">
                Amount
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.c.border }}>
              <View style={{ flex: 1 }}>
                <Text size="sm">{inv.item.description}</Text>
                {inv.item.periodStart ? (
                  <Text size="xs" color="muted" style={{ marginTop: 2 }}>
                    Service period {fmt(inv.item.periodStart)} – {fmt(inv.item.periodEnd)}
                    {inv.item.creditDays ? ` (includes ${inv.item.creditDays} days carried over)` : ""}
                  </Text>
                ) : null}
              </View>
              <Text size="sm" tabular>
                {inr(inv.amount)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 24, paddingVertical: 12 }}>
              <Text size="sm" weight="semibold">
                Total paid
              </Text>
              <Text size="lg" weight="semibold" tabular>
                {inr(inv.amount)}
              </Text>
            </View>
          </View>

          <Grid cols={{ base: 1, sm: 2 }} gap={4} style={{ marginTop: 16 }}>
            <Text size="xs" color="muted">
              Payment ID: {inv.paymentId}
            </Text>
            <Text size="xs" color="muted">
              Order ID: {inv.orderId}
            </Text>
            <Text size="xs" color="muted">
              Method: {inv.method ? inv.method.toUpperCase() : "—"} (via Razorpay)
            </Text>
            <Text size="xs" color="muted">
              Status: {inv.status === "paid" ? "Paid" : inv.status}
            </Text>
          </Grid>
          <Text size="xs" color="muted" style={{ marginTop: 28, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.c.border }}>
            This is a computer-generated invoice and needs no signature. Digital subscription — nothing is shipped. See the refund & cancellation policy on our website.
          </Text>
        </View>
      )}
    </Screen>
  );
}
