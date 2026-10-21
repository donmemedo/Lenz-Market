"use client";

import { createContext, useContext, useEffect } from "react";
import { getDict, isRtl, type Dict } from "@/lib/i18n";

const Ctx = createContext<{ locale: string; t: Dict; rtl: boolean }>({
  locale: "fa", t: getDict("fa"), rtl: true,
});

export const useI18n = () => useContext(Ctx);

export function LocaleProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  const rtl = isRtl(locale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [locale, rtl]);
  return <Ctx.Provider value={{ locale, t: getDict(locale), rtl }}>{children}</Ctx.Provider>;
}
