// Free calculators (no sign-up) — shared building blocks + the 4 original tools. Maths identical to the web app.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { emi, sipFutureValue } from "@/shared/finance-rules";
import { CURRENCIES, currencyLocale } from "@/shared/currencies";
import { Field, Grid, Input, Select, Text, useBreakpoint, useTheme } from "@/ui";

export const fmtFor = (cur: string) => (n: number) => {
  try {
    return new Intl.NumberFormat(currencyLocale(cur), { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(Math.round(n));
  } catch {
    return `${cur} ${Math.round(n)}`;
  }
};

/** Number field. Keeps the typed text (so "8." can be typed) and reports the number (never below min). */
export function Num({ label, value, onChange, suffix, min = 0 }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number; min?: number; max?: number }) {
  const t = useTheme();
  const [text, setText] = useState(String(Number.isFinite(value) ? value : 0));
  useEffect(() => {
    // external change (swap / clamp) → show it, unless it's what is already typed
    if (Number(text) !== value) setText(String(Number.isFinite(value) ? value : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field label={label}>
      <Input
        numeric
        value={text}
        accessibilityLabel={label}
        onChangeText={(v) => {
          setText(v);
          // like the web version: only the minimum is enforced while typing (max is a hint)
          onChange(Math.max(min, Number(v) || 0));
        }}
        right={
          suffix ? (
            <Text size="xs" color="muted" style={{ marginLeft: 6 }}>
              {suffix}
            </Text>
          ) : undefined
        }
        style={{ color: t.c.fg }}
      />
    </Field>
  );
}

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));

export function CurrencyPick({ cur, setCur, label = "Currency" }: { cur: string; setCur: (c: string) => void; label?: string }) {
  return (
    <Field label={label}>
      <Select value={cur} onChange={setCur} options={CURRENCY_OPTIONS} title={label} searchable />
    </Field>
  );
}

export function Result({ items }: { items: [string, string, boolean?][] }) {
  const t = useTheme();
  return (
    <Grid cols={{ base: 1, sm: 3 }}>
      {items.map(([k, v, strong]) => (
        <View key={k} style={{ borderRadius: 14, borderWidth: 1, padding: 16, borderColor: strong ? t.a("primary", 0.4) : t.c.border, backgroundColor: strong ? t.a("primary", 0.1) : t.c.surface }}>
          <Text size="xs" color="muted">
            {k}
          </Text>
          <Text size="xl" weight="semibold" tabular style={{ marginTop: 4 }}>
            {v}
          </Text>
        </View>
      ))}
    </Grid>
  );
}

/** Small explanatory note under a calculator. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <Text size="xs" color="muted">
      {children}
    </Text>
  );
}

export function Cta() {
  const t = useTheme();
  return (
    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface, padding: 16, marginTop: 4 }}>
      <Text size="sm" color="muted">
        Want this tracked automatically every month — with reminders and an AI that explains it in Hindi or Gujarati?{" "}
        <Text size="sm" weight="medium" color="primary" accessibilityRole="link" onPress={() => router.push("/register" as never)}>
          Create a free Budget Pro account →
        </Text>
      </Text>
    </View>
  );
}

/** Segmented choice (compounding, mode…). */
export function Seg<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { v: T; l: string }[]; label: string }) {
  const t = useTheme();
  return (
    <Field label={label}>
      <View style={{ flexDirection: "row", height: 42, borderRadius: 10, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface2, padding: 4, gap: 4 }}>
        {items.map((it) => {
          const on = value === it.v;
          return (
            <Pressable key={it.v} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(it.v)} style={{ flex: 1, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: on ? t.c.primary : "transparent" }}>
              <Text size="xs" weight="medium" numberOfLines={1} style={{ color: on ? t.c.primaryFg : t.c.muted }}>
                {it.l}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}

/** Vertical stack with the calculators' standard spacing. */
export function Calc({ children }: { children: ReactNode }) {
  return <View style={{ gap: 20 }}>{children}</View>;
}

// ---------------- EMI ----------------
export function EmiCalculator() {
  const t = useTheme();
  const bp = useBreakpoint();
  const [cur, setCur] = useState("INR");
  const [p, setP] = useState(500000);
  const [r, setR] = useState(10);
  const [years, setYears] = useState(5);
  const f = fmtFor(cur);
  const n = Math.round(years * 12);
  const m = emi(p, r, n);
  const total = m * n;
  const schedule = useMemo(() => {
    const out: { year: number; principal: number; interest: number; balance: number }[] = [];
    let bal = p;
    const mr = r / 12 / 100;
    for (let y = 1; y <= Math.ceil(n / 12); y++) {
      let pi = 0;
      let ii = 0;
      for (let k = 0; k < 12 && bal > 0.5; k++) {
        const int = bal * mr;
        const prin = Math.min(bal, m - int);
        ii += int;
        pi += prin;
        bal -= prin;
      }
      out.push({ year: y, principal: pi, interest: ii, balance: Math.max(0, bal) });
    }
    return out;
  }, [p, r, n, m]);
  const cell = (s: string, head?: boolean, right = true) => (
    <Text size={bp.sm ? "sm" : "xs"} color={head ? "muted" : "fg"} tabular={!head} style={{ flex: 1, textAlign: right ? "right" : "left" }}>
      {s}
    </Text>
  );
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Num label="Loan amount" value={p} onChange={setP} step={10000} />
        <Num label="Interest rate (yearly)" value={r} onChange={setR} suffix="%" step={0.1} max={60} />
        <Num label="Tenure" value={years} onChange={setYears} suffix="years" step={0.5} max={40} />
        <CurrencyPick cur={cur} setCur={setCur} />
      </Grid>
      <Result items={[["Monthly EMI", f(m), true], ["Total interest", f(total - p)], ["Total payment", f(total)]]} />
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: t.c.border, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.c.border }}>
          {cell("Year", true, false)}
          {cell("Principal paid", true)}
          {cell("Interest paid", true)}
          {cell("Balance left", true)}
        </View>
        {schedule.map((s, i) => (
          <View key={s.year} style={{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
            {cell(String(s.year), false, false)}
            {cell(f(s.principal))}
            {cell(f(s.interest))}
            {cell(f(s.balance))}
          </View>
        ))}
      </View>
      <Cta />
    </Calc>
  );
}

// ---------------- 50/30/20 ----------------
export function BudgetPlanner() {
  const t = useTheme();
  const [cur, setCur] = useState("INR");
  const [income, setIncome] = useState(60000);
  const [needsPct, setNeeds] = useState(50);
  const [wantsPct, setWants] = useState(30);
  const savePct = Math.max(0, 100 - needsPct - wantsPct);
  const f = fmtFor(cur);
  const def = (b: string, s: string) => (
    <Text size="sm" color="muted">
      <Text size="sm" weight="semibold">
        {b}
      </Text>{" "}
      {s}
    </Text>
  );
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Num label="Monthly take-home income" value={income} onChange={setIncome} step={1000} />
        <Num label="Needs" value={needsPct} onChange={(v) => setNeeds(Math.min(100, v))} suffix="%" max={100} />
        <Num label="Wants" value={wantsPct} onChange={(v) => setWants(Math.min(100 - needsPct, v))} suffix="%" max={100} />
        <CurrencyPick cur={cur} setCur={setCur} />
      </Grid>
      <Result items={[[`Needs (${needsPct}%)`, f((income * needsPct) / 100)], [`Wants (${wantsPct}%)`, f((income * wantsPct) / 100)], [`Savings (${savePct}%)`, f((income * savePct) / 100), true]]} />
      <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: t.c.surface2 }}>
        <View style={{ width: `${needsPct}%`, backgroundColor: t.series[0] }} />
        <View style={{ width: `${wantsPct}%`, backgroundColor: t.series[1] }} />
        <View style={{ width: `${savePct}%`, backgroundColor: t.series[2] }} />
      </View>
      <Grid cols={{ base: 1, sm: 3 }}>
        {def("Needs:", "rent, groceries, bills, EMIs, insurance, transport, school fees.")}
        {def("Wants:", "eating out, shopping, entertainment, travel, subscriptions.")}
        {def("Savings:", "emergency fund first, then SIPs, goals and loan prepayment.")}
      </Grid>
      <Cta />
    </Calc>
  );
}

// ---------------- Savings goal ----------------
export function SavingsGoalCalculator() {
  const [cur, setCur] = useState("INR");
  const [target, setTarget] = useState(200000);
  const [saved, setSaved] = useState(20000);
  const [months, setMonths] = useState(18);
  const [rate, setRate] = useState(6);
  const f = fmtFor(cur);
  const r = rate / 12 / 100;
  const grownSaved = saved * Math.pow(1 + r, months);
  const remaining = Math.max(0, target - grownSaved);
  const monthly = remaining <= 0 ? 0 : r === 0 ? remaining / Math.max(1, months) : (remaining * r) / ((Math.pow(1 + r, months) - 1) * (1 + r));
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 2, lg: 5 }}>
        <Num label="Goal amount" value={target} onChange={setTarget} step={5000} />
        <Num label="Already saved" value={saved} onChange={setSaved} step={1000} />
        <Num label="Months to goal" value={months} onChange={(v) => setMonths(Math.max(1, Math.round(v)))} max={600} />
        <Num label="Expected return" value={rate} onChange={setRate} suffix="%/yr" step={0.5} max={30} />
        <CurrencyPick cur={cur} setCur={setCur} />
      </Grid>
      <Result items={[["Save every month", f(monthly), true], ["Your savings grow to", f(grownSaved)], ["Total you'll put in", f(saved + monthly * months)]]} />
      <Cta />
    </Calc>
  );
}

// ---------------- SIP ----------------
export function SipCalculator() {
  const [cur, setCur] = useState("INR");
  const [monthly, setMonthly] = useState(5000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const f = fmtFor(cur);
  const fv = sipFutureValue(monthly, rate, years * 12);
  const invested = monthly * years * 12;
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Num label="Monthly SIP" value={monthly} onChange={setMonthly} step={500} />
        <Num label="Expected return" value={rate} onChange={setRate} suffix="%/yr" step={0.5} max={30} />
        <Num label="Years" value={years} onChange={setYears} max={50} />
        <CurrencyPick cur={cur} setCur={setCur} />
      </Grid>
      <Result items={[["Estimated value", f(fv), true], ["You invest", f(invested)], ["Estimated gains", f(fv - invested)]]} />
      <Note>Illustration only — market returns are not guaranteed. Not investment advice.</Note>
      <Cta />
    </Calc>
  );
}
