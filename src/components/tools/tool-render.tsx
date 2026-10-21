import type { ComponentType } from "react";
import { BudgetPlanner, EmiCalculator, SavingsGoalCalculator, SipCalculator } from "./calculators";
import { CompoundCalculator, CurrencyConverter, EmergencyFundCalculator, FdCalculator, GstCalculator, IncomeTaxCalculator, InflationCalculator, NetWorthCalculator, PpfCalculator, PrepaymentCalculator, RdCalculator, RetirementCalculator } from "./more-calculators";

const MAP: Record<string, ComponentType> = {
  "emi-calculator": EmiCalculator,
  "budget-planner": BudgetPlanner,
  "savings-goal-calculator": SavingsGoalCalculator,
  "sip-calculator": SipCalculator,
  "income-tax-calculator": IncomeTaxCalculator,
  "fd-calculator": FdCalculator,
  "rd-calculator": RdCalculator,
  "ppf-calculator": PpfCalculator,
  "gst-calculator": GstCalculator,
  "inflation-calculator": InflationCalculator,
  "loan-prepayment-calculator": PrepaymentCalculator,
  "compound-interest-calculator": CompoundCalculator,
  "retirement-calculator": RetirementCalculator,
  "emergency-fund-calculator": EmergencyFundCalculator,
  "net-worth-calculator": NetWorthCalculator,
  "currency-converter": CurrencyConverter,
};

export function hasTool(slug: string): boolean {
  return slug in MAP;
}

export function ToolRender({ slug }: { slug: string }) {
  const C = MAP[slug];
  return C ? <C /> : null;
}
