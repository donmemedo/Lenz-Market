"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Briefcase, Building2, ChevronDown, Leaf, Plane, Search,
  Shapes, Sparkles, Users, Utensils, Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, mediaUrl, type Category, type Mission, type Photo, type PublicUser } from "@/lib/api";
import { compact, money, num } from "@/lib/format";
import { useI18n } from "./locale";
import { MissionCard } from "./mission-card";
import { Masonry, PhotoCard } from "./photo-card";
import { Button, Reveal, SectionHead, Skeleton } from "./ui";

const ICONS: Record<string, React.ElementType> = {
  leaf: Leaf, building: Building2, utensils: Utensils, users: Users,
  sparkles: Sparkles, briefcase: Briefcase, plane: Plane, shapes: Shapes,
};

const BRANDS = ["دیجی‌کالا", "اسنپ", "ایرانسل", "کافه بازار", "علی‌بابا", "تپسی", "دیوار", "بیمه‌بازار"];

type Stats = { photos: number; creators: number; missions: number; paid_out: number };

export function Home({ locale }: { locale: string }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [creators, setCreators] = useState<PublicUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [q, setQ] = useState("");
  const [faq, setFaq] = useState<number | null>(0);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 70]);

  useEffect(() => {
    void (async () => {
      const [p, m, c, cr, s] = await Promise.all([
        api<Photo[]>("/api/photos?limit=12&sort=trending"),
        api<Mission[]>("/api/missions?limit=3"),
        api<Category[]>("/api/categories"),
        api<PublicUser[]>("/api/creators?limit=6"),
        api<Stats>("/api/stats"),
      ]);
      setPhotos(p); setMissions(m); setCats(c); setCreators(cr); setStats(s);
    })().catch(() => setPhotos([]));
  }, []);

  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const statItems = stats
    ? [
        { v: compact(stats.photos, locale), l: t.stats.photos },
        { v: compact(stats.creators, locale), l: t.stats.creators },
        { v: num(stats.missions, locale), l: t.stats.missions },
        { v: `${compact(stats.paid_out, locale)} ${t.common.toman}`, l: t.stats.paid },
      ]
    : [];

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section ref={heroRef} className="relative overflow-hidden px-4 pb-16 pt-10 sm:pt-16">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-4 py-1.5 text-xs font-medium backdrop-blur"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-70" />
                <span className="relative inline-flex size-2 rounded-full gradient-bg" />
              </span>
              {t.hero.badge}
            </motion.span>

            <h1 className="mt-6 text-[clamp(2.6rem,7vw,4.6rem)] font-black leading-[1.08] tracking-tight">
              {[t.hero.title1, t.hero.title2, t.hero.title3].map((line, i) => (
                <motion.span key={i} className="block"
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
                  {i === 2 ? <span className="gradient-text">{line}</span> : line}
                </motion.span>
              ))}
            </h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.8 }}
              className="mt-6 max-w-xl text-base leading-8 text-muted sm:text-lg">
              {t.hero.sub}
            </motion.p>

            <motion.form
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.7 }}
              onSubmit={(e) => { e.preventDefault(); router.push(`/${locale}/explore?q=${encodeURIComponent(q)}`); }}
              className="glass mt-8 flex items-center gap-2 rounded-3xl p-2"
            >
              <Search className="ms-3 size-5 shrink-0 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.hero.search}
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted sm:text-base" />
              <Button type="submit" size="md" className="shrink-0">{t.hero.searchBtn}</Button>
            </motion.form>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="mt-7 flex flex-wrap items-center gap-3">
              <Button href={`/${locale}/login?mode=signup`} size="lg">{t.cta.start} <Arrow className="size-4" /></Button>
              <Button href={`/${locale}/explore`} variant="ghost" size="lg">{t.cta.browse}</Button>
            </motion.div>
          </div>

          {/* floating collage */}
          <div className="relative h-[420px] sm:h-[520px]">
            {photos === null
              ? <Skeleton className="size-full" />
              : (
                <>
                  <motion.div style={{ y: y1 }} className="absolute inset-y-0 w-[46%] ltr:left-0 rtl:right-0">
                    {photos.slice(0, 2).map((p, i) => (
                      <motion.div key={p.id}
                        initial={{ opacity: 0, scale: 0.92, rotate: rtl ? 4 : -4 }}
                        animate={{ opacity: 1, scale: 1, rotate: rtl ? 2 : -2 }}
                        transition={{ delay: 0.2 + i * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        className="mb-4 overflow-hidden rounded-[2rem] border border-line shadow-2xl shadow-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrl(p.thumb)} alt={p.title} className="h-[240px] w-full object-cover" />
                      </motion.div>
                    ))}
                  </motion.div>
                  <motion.div style={{ y: y2 }} className="absolute inset-y-6 w-[46%] ltr:right-0 rtl:left-0">
                    {photos.slice(2, 4).map((p, i) => (
                      <motion.div key={p.id}
                        initial={{ opacity: 0, scale: 0.92, rotate: rtl ? -4 : 4 }}
                        animate={{ opacity: 1, scale: 1, rotate: rtl ? -2 : 2 }}
                        transition={{ delay: 0.3 + i * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        className="mb-4 overflow-hidden rounded-[2rem] border border-line shadow-2xl shadow-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrl(p.thumb)} alt={p.title} className="h-[240px] w-full object-cover" />
                      </motion.div>
                    ))}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                    className="glass absolute bottom-6 start-1/2 flex -translate-x-1/2 items-center gap-3 rounded-3xl px-4 py-3 rtl:translate-x-1/2">
                    <span className="grid size-10 place-items-center rounded-2xl gradient-bg"><Wallet className="size-5 text-white" /></span>
                    <div className="leading-tight">
                      <p className="text-xs text-muted">{t.dash.balance}</p>
                      <p className="text-sm font-extrabold">{money(2_450_000, locale)} {t.common.toman}</p>
                    </div>
                  </motion.div>
                </>
              )}
          </div>
        </div>

        {/* stats bar */}
        <div className="mx-auto mt-16 max-w-7xl">
          <div className="glass grid grid-cols-2 gap-6 rounded-[2rem] p-6 sm:p-8 lg:grid-cols-4">
            {(statItems.length ? statItems : Array.from({ length: 4 })).map((s, i) => (
              <Reveal key={i} i={i}>
                {s ? (
                  <div>
                    <p className="text-2xl font-black gradient-text sm:text-3xl">{(s as { v: string }).v}</p>
                    <p className="mt-1 text-xs text-muted sm:text-sm">{(s as { l: string }).l}</p>
                  </div>
                ) : <Skeleton className="h-12" />}
              </Reveal>
            ))}
          </div>
        </div>

        {/* brand marquee */}
        <div className="mx-auto mt-10 max-w-7xl overflow-hidden">
          <p className="mb-4 text-center text-xs text-muted">{t.hero.trust}</p>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2 sm:justify-center sm:flex-wrap">
            {BRANDS.map((b) => (
              <span key={b} className="shrink-0 rounded-2xl border border-line bg-surface/50 px-4 py-2 text-sm font-medium text-muted">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CATEGORIES ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionHead eyebrow={t.sections.categories} title={t.sections.categories} sub={t.sections.categoriesSub} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cats.map((c, i) => {
            const Icon = ICONS[c.icon] ?? Sparkles;
            return (
              <Reveal key={c.slug} i={i}>
                <Link href={`/${locale}/explore?category=${c.slug}`}
                  className="card-hover group flex h-full items-center gap-3 rounded-3xl border border-line bg-surface/60 p-4 backdrop-blur">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand transition group-hover:gradient-bg group-hover:text-white">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-bold">{locale === "fa" ? c.fa : c.en}</span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------------- FEATURED ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <SectionHead
          eyebrow="★" title={t.sections.featured} sub={t.sections.featuredSub}
          action={<Button href={`/${locale}/explore`} variant="ghost">{t.cta.browse} <Arrow className="size-4" /></Button>}
        />
        {photos === null ? (
          <Masonry>{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="mb-4 h-56 w-full" />)}</Masonry>
        ) : (
          <Masonry>{photos.map((p, i) => <PhotoCard key={p.id} photo={p} i={i} />)}</Masonry>
        )}
      </section>

      {/* ---------------- MISSIONS ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionHead
          eyebrow={t.nav.missions} title={t.sections.missions} sub={t.sections.missionsSub}
          action={<Button href={`/${locale}/missions`} variant="ghost">{t.common.more} <Arrow className="size-4" /></Button>}
        />
        <div className="grid gap-5 md:grid-cols-3">
          {missions.map((m, i) => <MissionCard key={m.id} mission={m} i={i} />)}
        </div>
      </section>

      {/* ---------------- HOW ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionHead eyebrow="۱۲۳" title={t.sections.how} sub={t.sections.howSub} />
        <div className="grid gap-5 md:grid-cols-3">
          {t.how.map((s, i) => (
            <Reveal key={s.t} i={i}>
              <div className="card-hover relative h-full overflow-hidden rounded-3xl border border-line bg-surface/60 p-7 backdrop-blur">
                <span className="absolute -top-6 text-[7rem] font-black leading-none text-ink/5 ltr:-right-1 rtl:-left-1">
                  {num(i + 1, locale)}
                </span>
                <span className="grid size-12 place-items-center rounded-2xl gradient-bg text-lg font-black text-white ring-glow">
                  {num(i + 1, locale)}
                </span>
                <h3 className="mt-5 text-xl font-bold">{s.t}</h3>
                <p className="mt-2 leading-8 text-muted">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- CREATORS ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionHead eyebrow={t.nav.creators} title={t.sections.creators} sub={t.sections.creatorsSub} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {creators.map((c, i) => (
            <Reveal key={c.id} i={i}>
              <Link href={`/${locale}/creators/${c.id}`}
                className="card-hover flex h-full flex-col items-center gap-3 rounded-3xl border border-line bg-surface/60 p-5 text-center backdrop-blur">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.avatar} alt={c.name} className="size-16 rounded-2xl object-cover ring-2 ring-brand/30" />
                <div>
                  <p className="text-sm font-bold">{c.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{c.city}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <SectionHead eyebrow="FAQ" title={t.sections.faq} />
        <div className="space-y-3">
          {t.faq.map((f, i) => (
            <Reveal key={f.q} i={i}>
              <button onClick={() => setFaq(faq === i ? null : i)}
                className="w-full overflow-hidden rounded-3xl border border-line bg-surface/60 p-5 text-start backdrop-blur transition hover:bg-surface">
                <span className="flex items-center justify-between gap-4">
                  <span className="font-bold">{f.q}</span>
                  <ChevronDown className={`size-5 shrink-0 text-muted transition-transform duration-300 ${faq === i ? "rotate-180" : ""}`} />
                </span>
                <motion.span initial={false} animate={{ height: faq === i ? "auto" : 0, opacity: faq === i ? 1 : 0 }}
                  className="block overflow-hidden text-sm leading-8 text-muted">
                  <span className="block pt-3">{f.a}</span>
                </motion.span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] gradient-bg px-6 py-16 text-center text-white sm:px-16">
            <div className="absolute inset-0 opacity-30"
              style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #fff5 0 20%, transparent 60%), radial-gradient(circle at 80% 70%, #fff4 0 20%, transparent 60%)" }} />
            <div className="relative">
              <h2 className="text-3xl font-black sm:text-5xl">{t.cta.sell}</h2>
              <p className="mx-auto mt-4 max-w-xl leading-8 opacity-90">{t.hero.sub}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button href={`/${locale}/login?mode=signup`} variant="soft" size="lg"
                  className="bg-white text-brand hover:bg-white/90">{t.cta.start}</Button>
                <Button href={`/${locale}/missions`} variant="ghost" size="lg"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20">{t.nav.missions}</Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
