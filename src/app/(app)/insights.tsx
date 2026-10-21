import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import useSWR from "swr";
import { Bot, Lock, MessageCircle, RefreshCw, Sparkles } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { InsightRow, type InsightView } from "@/components/insight-row";
import { useAngelOptional } from "@/components/angel/angel-provider";
import { useSession } from "@/components/session";
import { go } from "@/components/shell";
import { kv } from "@/lib/storage";
import { timeAgo } from "@/lib/format";
import { Button, Card, ErrorState, PageHeader, Screen, Select, Skeleton, Text, useBreakpoint, useTheme } from "@/ui";

interface Resp {
  insights: (InsightView & { ask?: string; href?: string })[];
  lockedCount: number;
  generatedAt: string;
  advancedEnabled: boolean;
  plan: string;
  lang: string;
}

const LANGS = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
  { value: "gu", label: "ગુજરાતી" },
  { value: "hn", label: "Hinglish" },
];
const LANG_KEY = "bp_insights_lang";

function Inner() {
  const t = useTheme();
  const bp = useBreakpoint();
  const { user } = useSession();
  const angel = useAngelOptional();
  const [lang, setLang] = useState<string>(user.language && user.language !== "auto" ? user.language : "en");
  useEffect(() => {
    void kv.get(LANG_KEY).then((v) => {
      if (v && LANGS.some((x) => x.value === v)) setLang(v);
    });
  }, []);
  const { data, error, isLoading, mutate, isValidating } = useSWR<Resp>(`/api/insights?lang=${lang}`);

  const changeLang = (v: string) => {
    setLang(v);
    void kv.set(LANG_KEY, v);
  };

  const ask = (q: string) => {
    if (!angel?.eligible) return;
    angel.setOpen(true);
    void angel.send(q, "text");
  };

  return (
    <Screen onRefresh={() => void mutate()} refreshing={false}>
      <PageHeader
        title="Angel AI suggestions"
        subtitle={data ? `Thought through from your real numbers · updated ${timeAgo(data.generatedAt)}` : "Personal suggestions from Budget Pro's own AI, based on your real data."}
        actions={
          <>
            <View style={{ width: 150 }}>
              <Select value={lang} onChange={changeLang} options={LANGS} title="Language" accessibilityLabel="Language" />
            </View>
            <Button variant="secondary" icon={RefreshCw} onPress={() => void mutate()} loading={isValidating}>
              Refresh
            </Button>
          </>
        }
      />
      <Card padded style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 11, borderWidth: 1, borderColor: t.a("primary", 0.3), backgroundColor: t.a("primary", 0.1), alignItems: "center", justifyContent: "center" }}>
          <Bot size={20} color={t.c.primary} />
        </View>
        <Text size="sm" color="muted" style={{ flex: 1 }}>
          These come from{" "}
          <Text size="sm" weight="medium">
            Angel
          </Text>
          , Budget Pro&apos;s own AI (no third-party AI). It compares this month with your usual, checks budgets, goals, EMIs and your emergency cushion, and tells you what to do next.
          {angel?.eligible ? " Tap “Ask Angel” on any card to go deeper." : ""}
        </Text>
      </Card>
      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <View style={{ gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={80} />
          ))}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {data.insights.map((i) => (
            <View key={i.id} style={{ gap: 6 }}>
              <InsightRow insight={i} />
              {i.ask || i.href ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingLeft: bp.sm ? 48 : 0 }}>
                  {i.ask && angel?.eligible ? (
                    <Button size="sm" variant="ghost" icon={MessageCircle} onPress={() => ask(i.ask!)}>
                      {`Ask Angel: ${i.ask}`}
                    </Button>
                  ) : null}
                  {i.href ? (
                    <Button size="sm" variant="ghost" onPress={() => router.push(i.href as never)}>
                      Open →
                    </Button>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
          {!data.advancedEnabled ? (
            <Card padded style={{ flexDirection: bp.sm ? "row" : "column", alignItems: bp.sm ? "center" : "flex-start", gap: 12, backgroundColor: t.a("primary", 0.05), borderColor: t.a("primary", 0.25) }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: t.a("primary", 0.3), backgroundColor: t.a("primary", 0.1), alignItems: "center", justifyContent: "center" }}>
                {data.lockedCount ? <Lock size={20} color={t.c.primary} /> : <Sparkles size={20} color={t.c.primary} />}
              </View>
              <View style={{ flex: bp.sm ? 1 : undefined }}>
                <Text size="sm" weight="semibold">
                  {data.lockedCount ? `${data.lockedCount} advanced suggestion${data.lockedCount === 1 ? "" : "s"} available` : "Advanced suggestions"}
                </Text>
                <Text size="sm" color="muted">
                  Your 50/30/20 split, category anomalies, subscriptions review, debt-free date and more are included in Plus, Pro and Unlimited.
                </Text>
              </View>
              <Button onPress={() => go("/plan")}>View plans</Button>
            </Card>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

export default function InsightsPage() {
  return (
    <RequirePerm perm={["insights.view", "finance.read"]}>
      <Inner />
    </RequirePerm>
  );
}
