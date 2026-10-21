// Sign-in / sign-up / password reset. Already signed in → straight to the dashboard.
import { Redirect, Slot, useGlobalSearchParams } from "expo-router";
import { useAuth } from "@/components/session";
import { VisitTracker } from "@/components/tracker";

export default function AuthLayout() {
  const { status } = useAuth();
  // global: a layout's local params do not include the child screen's query string
  const { next } = useGlobalSearchParams<{ next?: string }>();
  if (status === "in") return <Redirect href={(typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard") as never} />;
  return (
    <>
      <VisitTracker />
      <Slot />
    </>
  );
}
