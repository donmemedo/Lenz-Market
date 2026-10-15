const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export const toFaDigits = (s: string | number) =>
  String(s).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export function money(v: number, locale: string) {
  const n = new Intl.NumberFormat("en-US").format(Math.round(v));
  return locale === "en" ? n : toFaDigits(n);
}

export function compact(v: number, locale: string) {
  const n = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  return locale === "en" ? n : toFaDigits(n).replace("K", " هزار").replace("M", " میلیون").replace("B", " میلیارد");
}

export function num(v: number, locale: string) {
  const n = new Intl.NumberFormat("en-US").format(v);
  return locale === "en" ? n : toFaDigits(n);
}

export function daysLeft(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function dateLabel(iso: string, locale: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fa-IR", {
    year: "numeric", month: "short", day: "numeric",
  }).format(d);
}
