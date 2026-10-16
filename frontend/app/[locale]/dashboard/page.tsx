"use client";

import { Heart, Images, LogOut, ShoppingBag, TrendingUp, Upload, Wallet } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale";
import { Masonry, PhotoCard } from "@/components/photo-card";
import { useAuth } from "@/components/providers";
import { Button, Reveal, Skeleton } from "@/components/ui";
import { api, mediaUrl, type Photo, type Purchase } from "@/lib/api";
import { dateLabel, money, num } from "@/lib/format";

type Earnings = { balance: number; photos: number; sales: number; likes: number; revenue: number };

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const { locale: loc } = useParams<{ locale: string }>();
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const [earn, setEarn] = useState<Earnings | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [buys, setBuys] = useState<Purchase[]>([]);
  const [tab, setTab] = useState<"photos" | "purchases">("photos");

  useEffect(() => { if (ready && !user) router.replace(`/${loc}/login`); }, [ready, user, router, loc]);

  useEffect(() => {
    if (!user) return;
    void api<Earnings>("/api/me/earnings").then(setEarn).catch(() => {});
    void api<Photo[]>(`/api/photos?owner_id=${user.id}&limit=60&sort=newest`).then(setPhotos).catch(() => {});
    void api<Purchase[]>("/api/purchases").then(setBuys).catch(() => {});
  }, [user]);

  if (!user) return <div className="mx-auto max-w-7xl px-4 py-16"><Skeleton className="h-64 w-full" /></div>;

  const cards = [
    { icon: Wallet, label: t.dash.balance, value: `${money(earn?.balance ?? 0, locale)} ${t.common.toman}`, accent: true },
    { icon: Images, label: t.dash.photos, value: num(earn?.photos ?? 0, locale) },
    { icon: ShoppingBag, label: t.dash.sales, value: num(earn?.sales ?? 0, locale) },
    { icon: Heart, label: t.dash.likes, value: num(earn?.likes ?? 0, locale) },
    { icon: TrendingUp, label: t.dash.revenue, value: `${money(earn?.revenue ?? 0, locale)} ${t.common.toman}` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Reveal>
        <div className="glass flex flex-col items-center gap-5 rounded-[2rem] p-6 text-center sm:flex-row sm:text-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.avatar} alt={user.name} className="size-20 rounded-3xl object-cover ring-4 ring-brand/30" />
          <div>
            <p className="text-sm text-muted">{t.dash.hello} 👋</p>
            <h1 className="text-3xl font-black">{user.name}</h1>
          </div>
          <div className="flex gap-2 sm:ms-auto">
            <Button href={`/${loc}/upload`}><Upload className="size-4" />{t.nav.upload}</Button>
            <Button variant="ghost" onClick={async () => { await logout(); router.push(`/${loc}`); }}>
              <LogOut className="size-4" />{t.cta.logout}
            </Button>
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c, i) => (
          <Reveal key={c.label} i={i}>
            <div className={`h-full rounded-3xl border border-line p-5 backdrop-blur ${c.accent ? "gradient-bg text-white ring-glow" : "bg-surface/60"}`}>
              <c.icon className={`size-5 ${c.accent ? "text-white" : "text-brand"}`} />
              <p className={`mt-3 text-xl font-black ${c.accent ? "" : ""}`}>{c.value}</p>
              <p className={`mt-1 text-xs ${c.accent ? "text-white/80" : "text-muted"}`}>{c.label}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-10 flex gap-2 border-b border-line pb-4">
        {([["photos", t.dash.myPhotos], ["purchases", t.dash.purchases]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${tab === key ? "gradient-bg text-white" : "bg-ink/5 text-muted hover:bg-ink/10 dark:bg-white/10"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "photos" ? (
          photos.length === 0
            ? <p className="py-20 text-center text-muted">{t.dash.emptyPhotos}</p>
            : <Masonry>{photos.map((p, i) => <PhotoCard key={p.id} photo={p} i={i} />)}</Masonry>
        ) : buys.length === 0 ? (
          <p className="py-20 text-center text-muted">{t.dash.emptyBuys}</p>
        ) : (
          <div className="grid gap-3">
            {buys.map((b) => (
              <div key={b.id} className="flex items-center gap-4 rounded-3xl border border-line bg-surface/60 p-3 backdrop-blur">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(b.photo.thumb)} alt="" className="size-16 rounded-2xl object-cover" />
                <div className="min-w-0">
                  <p className="truncate font-bold">{locale === "fa" ? b.photo.title_fa : b.photo.title}</p>
                  <p className="text-xs text-muted">{dateLabel(b.created_at, locale)} · {b.license}</p>
                </div>
                <p className="ms-auto shrink-0 font-black text-brand">{money(b.amount, locale)} {t.common.toman}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
