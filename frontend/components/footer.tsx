"use client";

import { AtSign, Camera, Globe, Send } from "lucide-react";
import Link from "next/link";
import { useI18n } from "./locale";

export function Footer({ locale }: { locale: string }) {
  const { t } = useI18n();
  const cols = [
    { title: t.footer.product, links: [[t.nav.explore, `/${locale}/explore`], [t.nav.missions, `/${locale}/missions`], [t.nav.creators, `/${locale}/creators`], [t.nav.upload, `/${locale}/upload`]] },
    { title: t.footer.company, links: [[t.footer.about, "#"], [t.footer.contact, "#"], [t.footer.help, "#"]] },
    { title: t.footer.legal, links: [[t.footer.privacy, "#"], [t.footer.terms, "#"]] },
  ];
  return (
    <footer className="mt-24 border-t border-line bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-2xl gradient-bg"><Camera className="size-5 text-white" /></span>
              <span className="text-lg font-extrabold">{t.brand}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-7 text-muted">{t.hero.sub}</p>
            <div className="mt-5 flex gap-2">
              {[AtSign, Send, Globe].map((Icon, i) => (
                <a key={i} href="#" className="grid size-10 place-items-center rounded-2xl border border-line transition hover:bg-ink/5 dark:hover:bg-white/10">
                  <Icon className="size-[18px]" />
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h3 className="mb-4 text-sm font-bold">{c.title}</h3>
              <ul className="space-y-3 text-sm text-muted">
                {c.links.map(([label, href]) => (
                  <li key={label}><Link href={href} className="transition hover:text-ink">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} {t.brand} — {t.footer.rights}</span>
          <span>{t.footer.made}</span>
        </div>
      </div>
    </footer>
  );
}
