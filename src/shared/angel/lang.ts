// Client copy of the shared language types (the full parser lives on the server).
export type Lang = "en" | "hi" | "gu" | "hn"; // hn = Hinglish (Hindi written in English letters)
export type PeriodKind = "today" | "yesterday" | "week" | "lastWeek" | "month" | "lastMonth" | "year" | "lastYear" | "lastNMonths" | "lastNDays" | "namedMonth" | "all";
export interface Period {
  kind: PeriodKind;
  start: Date;
  end: Date;
  n?: number;
  monthKey?: string;
}
