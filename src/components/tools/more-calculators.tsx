// More free calculators (no sign-up). Everything runs on the device except the currency converter, which reads
// live rates from our own /api/tools/fx endpoint.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { ArrowLeftRight, ChevronDown, ChevronRight } from "lucide-react-native";
import { api } from "@/lib/api";
import { CURRENCIES } from "@/shared/currencies";
import { incomeTax, type AgeGroup, type Regime } from "@/shared/tax-india";
import { emi } from "@/shared/finance-rules";
import { Field, Grid, Notice, Select, Text, useTheme } from "@/ui";
import { Calc, Cta, CurrencyPick, Note, Num, Result, Seg, fmtFor } from "./calculators";

const fdMaturity = (p: number, rate: number, months: number, perYear = 4) => p * Math.pow(1 + rate / (100 * perYear), (perYear * months) / 12);

function Panel({ children, highlight }: { children: ReactNode; highlight?: boolean }) {
  const t = useTheme();
  return <View style={{ borderRadius: 14, borderWidth: 1, padding: 16, gap: 8, borderColor: highlight ? t.a("primary", 0.4) : t.c.border, backgroundColor: highlight ? t.a("primary", 0.1) : t.c.surface }}>{children}</View>;
}

function Line({ label, value, tone, bold }: { label: string; value: string; tone?: "success"; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
      <Text size="xs" weight={bold ? "medium" : "regular"} color={tone ?? (bold ? "fg" : "muted")}>
        {label}
      </Text>
      <Text size="xs" weight={bold ? "medium" : "regular"} tabular color={tone ?? "fg"}>
        {value}
      </Text>
    </View>
  );
}

// ---------------- FD ----------------
export function FdCalculator() {
  const [cur, setCur] = useState("INR");
  const [p, setP] = useState(100000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(3);
  const [comp, setComp] = useState<"4" | "12" | "1">("4");
  const f = fmtFor(cur);
  const mat = fdMaturity(p, rate, years * 12, Number(comp));
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 2, lg: 5 }}>
        <Num label="Deposit amount" value={p} onChange={setP} step={10000} />
        <Num label="Interest rate" value={rate} onChange={setRate} suffix="%/yr" step={0.05} max={20} />
        <Num label="Tenure" value={years} onChange={setYears} suffix="years" step={0.25} max={20} />
        <Seg label="Compounding" value={comp} onChange={setComp} items={[{ v: "4", l: "Quarterly" }, { v: "12", l: "Monthly" }, { v: "1", l: "Yearly" }]} />
        <CurrencyPick cur={cur} setCur={setCur} />
      </Grid>
      <Result items={[["Maturity value", f(mat), true], ["Interest earned", f(mat - p)], ["Effective yearly yield", `${((Math.pow(mat / p, 1 / Math.max(0.01, years)) - 1) * 100).toFixed(2)}%`]]} />
      <Note>Indian banks usually compound FDs quarterly. FD interest is added to your income and taxed at your slab; banks deduct TDS above the yearly limit (submit Form 15G/15H if eligible).</Note>
      <Cta />
    </Calc>
  );
}

// ---------------- RD ----------------
export function RdCalculator() {
  const [cur, setCur] = useState("INR");
  const [m, setM] = useState(5000);
  const [rate, setRate] = useState(6.8);
  const [months, setMonths] = useState(24);
  const f = fmtFor(cur);
  const q = Math.pow(1 + rate / 400, 1 / 3);
  const mat = q === 1 ? m * months : (m * q * (Math.pow(q, months) - 1)) / (q - 1);
  const inv = m * months;
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Num label="Monthly deposit" value={m} onChange={setM} step={500} />
        <Num label="Interest rate" value={rate} onChange={setRate} suffix="%/yr" step={0.05} max={20} />
        <Num label="Tenure" value={months} onChange={(v) => setMonths(Math.min(600, Math.max(1, Math.round(v))))} suffix="months" max={600} />
        <CurrencyPick cur={cur} setCur={setCur} />
      </Grid>
      <Result items={[["Maturity value", f(mat), true], ["You deposit", f(inv)], ["Interest earned", f(mat - inv)]]} />
      <Note>Calculated the way Indian banks do: each instalment earns quarterly-compounded interest for the months it stays deposited.</Note>
      <Cta />
    </Calc>
  );
}

// ---------------- PPF ----------------
export function PpfCalculator() {
  const t = useTheme();
  const [yearly, setYearly] = useState(150000);
  const [rate, setRate] = useState(7.1);
  const [years, setYears] = useState(15);
  const [open, setOpen] = useState(false);
  const f = fmtFor("INR");
  const y = Math.min(60, Math.max(15, Math.round(years)));
  const amt = Math.min(150000, Math.max(500, yearly));
  let bal = 0;
  const rows: { year: number; balance: number; interest: number }[] = [];
  for (let i = 1; i <= y; i++) {
    const interest = (bal + amt) * (rate / 100); // deposit before 5 April → interest for the full year
    bal += amt + interest;
    rows.push({ year: i, balance: bal, interest });
  }
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 3 }}>
        <Num label="Yearly deposit (₹500 – ₹1.5 lakh)" value={yearly} onChange={setYearly} step={5000} max={150000} />
        <Num label="Interest rate (set by govt. every quarter)" value={rate} onChange={setRate} suffix="%/yr" step={0.05} max={15} />
        <Num label="Years (15, extend in blocks of 5)" value={years} onChange={setYears} min={15} max={50} step={5} />
      </Grid>
      <Result items={[["Maturity value (tax-free)", f(bal), true], ["Total deposited", f(amt * y)], ["Total interest", f(bal - amt * y)]]} />
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface, padding: 12 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {open ? <ChevronDown size={16} color={t.c.muted} /> : <ChevronRight size={16} color={t.c.muted} />}
          <Text size="sm" weight="medium">
            Year-by-year balance
          </Text>
        </Pressable>
        {open ? (
          <Grid cols={{ base: 2, sm: 3 }} gap={16} style={{ marginTop: 8 }}>
            {rows.map((r) => (
              <View key={r.year} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text size="sm" color="muted" tabular>
                  Year {r.year}
                </Text>
                <Text size="sm" tabular>
                  {f(r.balance)}
                </Text>
              </View>
            ))}
          </Grid>
        ) : null}
      </View>
      <Note>PPF is EEE: deposits qualify for 80C (old regime), and interest and maturity are tax-free. Deposit before 5 April each year for interest on the full amount. Check the current rate on India Post / your bank.</Note>
      <Cta />
    </Calc>
  );
}

// ---------------- Income tax ----------------
const AGE_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: "below60", label: "Below 60" },
  { value: "60to80", label: "60 – 80" },
  { value: "above80", label: "Above 80" },
];

export function IncomeTaxCalculator() {
  const t = useTheme();
  const [salary, setSalary] = useState(1500000);
  const [other, setOther] = useState(0);
  const [ded, setDed] = useState(150000);
  const [age, setAge] = useState<AgeGroup>("below60");
  const f = fmtFor("INR");
  const nw = incomeTax({ regime: "new", salary, other, deductions: 0, age });
  const old = incomeTax({ regime: "old", salary, other, deductions: ded, age });
  const better: Regime = nw.total <= old.total ? "new" : "old";
  const col = (r: typeof nw, title: string) => (
    <Panel highlight={better === r.regime}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text size="sm" weight="semibold">
          {title}
        </Text>
        {better === r.regime ? (
          <View style={{ borderRadius: 20, backgroundColor: t.c.primary, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text size="2xs" weight="semibold" style={{ color: t.c.primaryFg }}>
              Lower tax
            </Text>
          </View>
        ) : null}
      </View>
      <Text size="2xl" weight="semibold" tabular>
        {f(r.total)}
      </Text>
      <Text size="xs" color="muted">
        ≈ {f(r.monthlyTds)}/month · effective {r.effectiveRate.toFixed(1)}%
      </Text>
      <View style={{ gap: 4, marginTop: 4 }}>
        <Line label="Gross income" value={f(r.gross)} />
        <Line label="Standard deduction" value={`−${f(r.standardDeduction)}`} />
        {r.regime === "old" ? <Line label="Deductions (80C, 80D, HRA…)" value={`−${f(Math.max(0, ded))}`} /> : null}
        <Line label="Taxable income" value={f(r.taxable)} bold />
        <Line label="Tax on slabs" value={f(r.slabTax)} />
        {r.rebate > 0 ? <Line label="Rebate u/s 87A" value={`−${f(r.rebate)}`} tone="success" /> : null}
        {r.surcharge > 0 ? <Line label="Surcharge" value={f(r.surcharge)} /> : null}
        <Line label="Cess 4%" value={f(r.cess)} />
      </View>
    </Panel>
  );
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Num label="Annual salary / pension (gross)" value={salary} onChange={setSalary} step={50000} />
        <Num label="Other income (interest, rent, freelance)" value={other} onChange={setOther} step={10000} />
        <Num label="Old-regime deductions (80C, 80D, HRA, home loan)" value={ded} onChange={setDed} step={10000} />
        <Field label="Age">
          <Select value={age} onChange={setAge} options={AGE_OPTIONS} title="Age" />
        </Field>
      </Grid>
      <Grid cols={{ base: 1, md: 2 }}>
        {col(nw, "New regime (default)")}
        {col(old, "Old regime")}
      </Grid>
      {nw.total === old.total ? (
        <Text size="sm">Both regimes give the same tax.</Text>
      ) : (
        <Text size="sm">
          You save <Text size="sm" weight="bold">{f(Math.abs(nw.total - old.total))}</Text> a year with the <Text size="sm" weight="bold">{better} regime</Text>.
        </Text>
      )}
      <Note>FY 2026-27 (AY 2027-28) rates for resident individuals; Budget 2026 kept the slabs unchanged. Capital gains and other special-rate income are not included. For guidance only — not tax advice.</Note>
      <Cta />
    </Calc>
  );
}

// ---------------- GST ----------------
const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40];

export function GstCalculator() {
  const [amount, setAmount] = useState(10000);
  const [rate, setRate] = useState(18);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const f = (n: number) => fmtFor("INR")(n);
  const base = mode === "add" ? amount : (amount * 100) / (100 + rate);
  const tax = (base * rate) / 100;
  const total = base + tax;
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 3 }}>
        <Num label={mode === "add" ? "Price before GST" : "Price including GST"} value={amount} onChange={setAmount} step={100} />
        <Field label="GST rate">
          <Select value={String(rate)} onChange={(v) => setRate(Number(v))} options={GST_RATES.map((r) => ({ value: String(r), label: `${r}%` }))} title="GST rate" />
        </Field>
        <Seg label="Mode" value={mode} onChange={setMode} items={[{ v: "add", l: "Add GST" }, { v: "remove", l: "Remove GST" }]} />
      </Grid>
      <Result items={[["Total price", f(total), true], ["Price before GST", f(base)], [`GST @ ${rate}%`, f(tax)]]} />
      <Grid cols={{ base: 1, sm: 2 }}>
        <Panel>
          <Text size="sm" color="muted">
            Within your state:{" "}
            <Text size="sm" weight="semibold">
              CGST {f(tax / 2)}
            </Text>{" "}
            +{" "}
            <Text size="sm" weight="semibold">
              SGST {f(tax / 2)}
            </Text>
          </Text>
        </Panel>
        <Panel>
          <Text size="sm" color="muted">
            To another state:{" "}
            <Text size="sm" weight="semibold">
              IGST {f(tax)}
            </Text>
          </Text>
        </Panel>
      </Grid>
      <Note>Rates change with GST Council decisions — check the current rate for your item.</Note>
      <Cta />
    </Calc>
  );
}

// ---------------- Inflation ----------------
export function InflationCalculator() {
  const [cur, setCur] = useState("INR");
  const [amount, setAmount] = useState(100000);
  const [rate, setRate] = useState(6);
  const [years, setYears] = useState(10);
  const f = fmtFor(cur);
  const future = amount * Math.pow(1 + rate / 100, years);
  const power = amount / Math.pow(1 + rate / 100, years);
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Num label="Amount today" value={amount} onChange={setAmount} step={5000} />
        <Num label="Inflation" value={rate} onChange={setRate} suffix="%/yr" step={0.25} max={30} />
        <Num label="Years" value={years} onChange={setYears} max={60} />
        <CurrencyPick cur={cur} setCur={setCur} />
      </Grid>
      <Result items={[["Same things will cost", f(future), true], ["Today's money will be worth", f(power)], ["Value lost", `${(100 - (power / amount) * 100).toFixed(1)}%`]]} />
      <Note>Money that earns less than inflation loses value. Keep long-term savings in options that beat inflation over time.</Note>
      <Cta />
    </Calc>
  );
}

// ---------------- Loan prepayment ----------------
export function PrepaymentCalculator() {
  const [cur, setCur] = useState("INR");
  const [p, setP] = useState(3000000);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const [extra, setExtra] = useState(5000);
  const [lump, setLump] = useState(0);
  const f = fmtFor(cur);
  const res = useMemo(() => {
    const n = Math.round(years * 12);
    const m = emi(p, rate, n);
    const r = rate / 12 / 100;
    let bal = Math.max(0, p - lump);
    let months = 0;
    let interest = 0;
    while (bal > 0.5 && months < 1200 && m + extra > bal * r) {
      const int = bal * r;
      interest += int;
      bal = bal + int - (m + extra);
      months++;
    }
    const baseInterest = m * n - p;
    return { m, months, interest, baseInterest, n };
  }, [p, rate, years, extra, lump]);
  const saved = Math.max(0, res.baseInterest - res.interest);
  const cut = Math.max(0, res.n - res.months);
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 3, lg: 6 }}>
        <Num label="Loan outstanding" value={p} onChange={setP} step={50000} />
        <Num label="Interest rate" value={rate} onChange={setRate} suffix="%" step={0.05} max={30} />
        <Num label="Remaining tenure" value={years} onChange={setYears} suffix="yrs" step={0.5} max={40} />
        <Num label="Extra every month" value={extra} onChange={setExtra} step={1000} />
        <Num label="One-time prepayment now" value={lump} onChange={setLump} step={10000} />
        <CurrencyPick cur={cur} setCur={setCur} />
      </Grid>
      <Result items={[["Interest you save", f(saved), true], ["Loan ends earlier by", `${Math.floor(cut / 12)} yr ${cut % 12} mo`], ["Current EMI", f(res.m)]]} />
      <Note>Banks can&apos;t charge prepayment penalties on floating-rate home loans for individuals in India. Early prepayments save the most interest.</Note>
      <Cta />
    </Calc>
  );
}

// ---------------- Lump sum / compound interest ----------------
export function CompoundCalculator() {
  const [cur, setCur] = useState("INR");
  const [p, setP] = useState(100000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const [freq, setFreq] = useState<"1" | "4" | "12">("1");
  const f = fmtFor(cur);
  const n = Number(freq);
  const fv = p * Math.pow(1 + rate / (100 * n), n * years);
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 2, lg: 5 }}>
        <Num label="Amount invested" value={p} onChange={setP} step={10000} />
        <Num label="Return / interest" value={rate} onChange={setRate} suffix="%/yr" step={0.25} max={50} />
        <Num label="Years" value={years} onChange={setYears} max={60} />
        <Seg label="Compounding" value={freq} onChange={setFreq} items={[{ v: "1", l: "Yearly" }, { v: "4", l: "Quarterly" }, { v: "12", l: "Monthly" }]} />
        <CurrencyPick cur={cur} setCur={setCur} />
      </Grid>
      <Result items={[["Future value", f(fv), true], ["Invested", f(p)], ["Growth", `${f(fv - p)} (${(fv / p).toFixed(2)}×)`]]} />
      <Note>
        Rule of 72: money doubles in about {rate > 0 ? (72 / rate).toFixed(1) : "∞"} years at {rate}% a year.
      </Note>
      <Cta />
    </Calc>
  );
}

// ---------------- Retirement ----------------
export function RetirementCalculator() {
  const [age, setAge] = useState(30);
  const [retire, setRetire] = useState(60);
  const [life, setLife] = useState(85);
  const [expense, setExpense] = useState(40000);
  const [infl, setInfl] = useState(6);
  const [pre, setPre] = useState(11);
  const [post, setPost] = useState(7);
  const [saved, setSaved] = useState(200000);
  const f = fmtFor("INR");
  const yrs = Math.max(0, retire - age);
  const retYears = Math.max(1, life - retire);
  const monthlyAtRetire = expense * Math.pow(1 + infl / 100, yrs);
  // corpus = present value of an inflation-growing pension over retirement years
  const real = (1 + post / 100) / (1 + infl / 100) - 1;
  const yearly = monthlyAtRetire * 12;
  const corpus = Math.abs(real) < 1e-9 ? yearly * retYears : yearly * ((1 - Math.pow(1 + real, -retYears)) / real) * (1 + real);
  const fvSaved = saved * Math.pow(1 + pre / 100, yrs);
  const gap = Math.max(0, corpus - fvSaved);
  const i = pre / 12 / 100;
  const n = yrs * 12;
  const sip = n === 0 ? gap : i === 0 ? gap / n : gap / (((Math.pow(1 + i, n) - 1) / i) * (1 + i));
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Num label="Your age" value={age} onChange={setAge} max={80} />
        <Num label="Retire at" value={retire} onChange={setRetire} max={80} />
        <Num label="Plan till age" value={life} onChange={setLife} max={110} />
        <Num label="Monthly expenses today" value={expense} onChange={setExpense} step={1000} />
        <Num label="Inflation" value={infl} onChange={setInfl} suffix="%" step={0.5} max={20} />
        <Num label="Return before retiring" value={pre} onChange={setPre} suffix="%" step={0.5} max={25} />
        <Num label="Return after retiring" value={post} onChange={setPost} suffix="%" step={0.5} max={20} />
        <Num label="Already saved for retirement" value={saved} onChange={setSaved} step={10000} />
      </Grid>
      <Result items={[["Corpus needed at retirement", f(corpus), true], ["Monthly SIP needed now", f(sip)], ["Monthly expenses at retirement", f(monthlyAtRetire)]]} />
      <Note>Assumes expenses keep rising with inflation after retirement. Illustration only — not investment advice.</Note>
      <Cta />
    </Calc>
  );
}

// ---------------- Emergency fund ----------------
export function EmergencyFundCalculator() {
  const [cur, setCur] = useState("INR");
  const [expense, setExpense] = useState(35000);
  const [emis, setEmis] = useState(10000);
  const [months, setMonths] = useState(6);
  const [saved, setSaved] = useState(50000);
  const [perMonth, setPerMonth] = useState(10000);
  const f = fmtFor(cur);
  const target = (expense + emis) * months;
  const gap = Math.max(0, target - saved);
  const eta = perMonth > 0 ? Math.ceil(gap / perMonth) : Infinity;
  return (
    <Calc>
      <Grid cols={{ base: 1, sm: 3, lg: 6 }}>
        <Num label="Monthly essential expenses" value={expense} onChange={setExpense} step={1000} />
        <Num label="Monthly EMIs" value={emis} onChange={setEmis} step={1000} />
        <Num label="Months of cover" value={months} onChange={(v) => setMonths(Math.min(24, Math.max(1, Math.round(v))))} max={24} />
        <Num label="Already saved" value={saved} onChange={setSaved} step={5000} />
        <Num label="Can save per month" value={perMonth} onChange={setPerMonth} step={1000} />
        <CurrencyPick cur={cur} setCur={setCur} />
      </Grid>
      <Result items={[["Emergency fund target", f(target), true], ["Still needed", f(gap)], ["Ready in", gap === 0 ? "Done ✓" : Number.isFinite(eta) ? `${eta} months` : "—"]]} />
      <Note>6 months is a good default; choose 9–12 if your income is irregular or you are the only earner. Keep it in a savings account, sweep-in FD or liquid fund.</Note>
      <Cta />
    </Calc>
  );
}

// ---------------- Net worth ----------------
export function NetWorthCalculator() {
  const [cur, setCur] = useState("INR");
  const [a, setA] = useState({ cash: 50000, investments: 300000, retirement: 200000, property: 0, gold: 50000, other: 0 });
  const [l, setL] = useState({ home: 0, vehicle: 0, personal: 0, cards: 0, other: 0 });
  const f = fmtFor(cur);
  const assets = (Object.values(a) as number[]).reduce((x, y) => x + y, 0);
  const liab = (Object.values(l) as number[]).reduce((x, y) => x + y, 0);
  const nw = assets - liab;
  const A: [keyof typeof a, string][] = [["cash", "Bank & cash"], ["investments", "Stocks / mutual funds / FDs"], ["retirement", "PF / PPF / NPS"], ["property", "Property"], ["gold", "Gold"], ["other", "Other assets"]];
  const Lb: [keyof typeof l, string][] = [["home", "Home loan"], ["vehicle", "Vehicle loan"], ["personal", "Personal / education loan"], ["cards", "Credit card dues"], ["other", "Other debts"]];
  return (
    <Calc>
      <Grid cols={{ base: 1, md: 2 }} gap={16}>
        <Panel>
          <Text size="sm" weight="semibold">
            What you own
          </Text>
          {A.map(([k, label]) => (
            <Num key={k} label={label} value={a[k]} onChange={(v) => setA((s) => ({ ...s, [k]: v }))} step={10000} />
          ))}
        </Panel>
        <Panel>
          <Text size="sm" weight="semibold">
            What you owe
          </Text>
          {Lb.map(([k, label]) => (
            <Num key={k} label={label} value={l[k]} onChange={(v) => setL((s) => ({ ...s, [k]: v }))} step={10000} />
          ))}
          <CurrencyPick cur={cur} setCur={setCur} />
        </Panel>
      </Grid>
      <Result items={[["Net worth", f(nw), true], ["Total assets", f(assets)], ["Total liabilities", f(liab)]]} />
      <Note>{liab > 0 && assets > 0 ? `Debt-to-asset ratio: ${((liab / assets) * 100).toFixed(0)}% — under 50% is healthy.` : "Track it every few months — a rising net worth is the clearest sign of progress."}</Note>
      <Cta />
    </Calc>
  );
}

// ---------------- Currency converter ----------------
const CUR_OPTIONS = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));

export function CurrencyConverter() {
  const t = useTheme();
  const [amount, setAmount] = useState(100);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const [rates, setRates] = useState<{ base: string; rates: Record<string, number>; updated: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setErr(null);
    api<{ base: string; rates: Record<string, number>; updated: string }>(`/api/tools/fx?base=${from}`)
      .then((r) => alive && setRates(r.data))
      .catch((e) => alive && setErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, [from]);
  const rate = rates?.base === from ? rates.rates[to] : undefined;
  const out = rate ? amount * rate : null;
  const fmt = (n: number, c: string) => {
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: n < 10 ? 4 : 2 }).format(n);
    } catch {
      return `${n.toFixed(2)} ${c}`;
    }
  };
  return (
    <Calc>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
        <View style={{ flexGrow: 1, flexBasis: 160 }}>
          <Num label="Amount" value={amount} onChange={setAmount} step={1} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 160 }}>
          <Field label="From">
            <Select value={from} onChange={setFrom} options={CUR_OPTIONS} title="From" searchable />
          </Field>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Swap currencies"
          onPress={() => {
            setFrom(to);
            setTo(from);
          }}
          style={(s) => ({ height: 42, width: 46, borderRadius: 10, borderWidth: 1, borderColor: t.c.border, alignItems: "center", justifyContent: "center", backgroundColor: s.pressed ? t.c.surface2 : "transparent" })}
        >
          <ArrowLeftRight size={16} color={t.c.fg} />
        </Pressable>
        <View style={{ flexGrow: 1, flexBasis: 160 }}>
          <Field label="To">
            <Select value={to} onChange={setTo} options={CUR_OPTIONS} title="To" searchable />
          </Field>
        </View>
      </View>
      {err ? (
        <Notice tone="warning">{err}</Notice>
      ) : (
        <Result items={[[`${fmt(amount, from)} =`, out === null ? "…" : fmt(out, to), true], [`1 ${from}`, rate ? fmt(rate, to) : "…"], [`1 ${to}`, rate ? fmt(1 / rate, from) : "…"]]} />
      )}
      <Note>Live mid-market rates{rates?.updated ? ` (updated ${new Date(rates.updated).toLocaleString("en-IN")})` : ""} by ExchangeRate-API. Banks and cards usually add a 1–3% markup.</Note>
      <Cta />
    </Calc>
  );
}
