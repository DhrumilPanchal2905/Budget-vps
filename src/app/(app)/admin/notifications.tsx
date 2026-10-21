import { useState } from "react";
import { View } from "react-native";
import { Megaphone } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { Button, Card, CardBody, Checkbox, ConfirmDialog, Field, Input, PageHeader, Screen, Select, useToast } from "@/ui";
import { api, ApiClientError } from "@/lib/api";

const AUDIENCE = [
  { value: "all", label: "All active users" },
  { value: "free", label: "Free plan" },
  { value: "plus", label: "Plus plan" },
  { value: "pro", label: "Pro plan" },
  { value: "unlimited", label: "Unlimited plan" },
  { value: "admins", label: "Admins only" },
];
const AUDIENCE_LABEL: Record<string, string> = { all: "all active users", free: "Free plan users", plus: "Plus plan users", pro: "Pro plan users", unlimited: "Unlimited plan users", admins: "administrators" };

function Inner() {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [push, setPush] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setErrors({});
    try {
      const r = await api("/api/admin/notifications", { method: "POST", body: { title, message, audience, push } });
      toast.success(r.message || "Broadcast sent.");
      setTitle("");
      setMessage("");
      setConfirm(false);
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setErrors(err.errors);
      toast.error("Broadcast failed", err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <PageHeader title="Broadcast" subtitle="Send an in-app (and optional push) notification to many users." />
      <Card style={{ maxWidth: 680, width: "100%" }}>
        <CardBody style={{ paddingTop: 18, gap: 14 }}>
          <Field label="Audience">
            <Select value={audience} onChange={setAudience} options={AUDIENCE} title="Audience" />
          </Field>
          <Field label="Title" error={errors.title}>
            <Input value={title} onChangeText={setTitle} maxLength={140} placeholder="e.g. Scheduled maintenance tonight" />
          </Field>
          <Field label="Message" error={errors.message}>
            <Input multiline value={message} onChangeText={setMessage} maxLength={1000} numberOfLines={5} style={{ minHeight: 110 }} />
          </Field>
          <Checkbox checked={push} onChange={setPush} label="Also send as push notification (to users who enabled push on web or in the app)" />
          <View style={{ flexDirection: "row" }}>
            <Button icon={Megaphone} disabled={!title.trim() || !message.trim()} onPress={() => title.trim() && message.trim() && setConfirm(true)}>
              Send broadcast
            </Button>
          </View>
        </CardBody>
      </Card>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={send}
        loading={busy}
        danger={false}
        confirmLabel="Send now"
        title="Send broadcast?"
        message={`“${title}” will be delivered to ${AUDIENCE_LABEL[audience]} immediately.`}
      />
    </Screen>
  );
}

export default function BroadcastPage() {
  return (
    <RequirePerm admin perm="admin.notifications.send">
      <Inner />
    </RequirePerm>
  );
}
