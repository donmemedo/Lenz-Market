"use client";

import { Check, Download, Heart, ShoppingBag, Tag } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale";
import { Masonry, PhotoCard } from "@/components/photo-card";
import { useAuth } from "@/components/providers";
import { Button, Reveal, Skeleton } from "@/components/ui";
import { api, mediaUrl, type Photo } from "@/lib/api";
import { dateLabel, money, num } from "@/lib/format";

export default function PhotoPage() {
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [similar, setSimilar] = useState<Photo[]>([]);
  const [license, setLicense] = useState<"standard" | "extended">("standard");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    void api<Photo>(`/api/photos/${id}`).then(async (p) => {
      setPhoto(p);
      setSimilar(await api<Photo[]>(`/api/photos?category=${p.category}&limit=8`));
    }).catch(() => {});
  }, [id]);

  const buy = async () => {
    if (!user) { window.location.href = `/${locale}/login`; return; }
    setStatus("busy"); setError("");
    try {
      await api(`/api/photos/${id}/buy?license=${license}`, { method: "POST" });
      setStatus("done");
    } catch (e) { setStatus("error"); setError((e as Error).message); }
  };

  if (!photo) return <div className="mx-auto max-w-7xl px-4 py-10"><Skeleton className="h-[60vh] w-full" /></div>;

  const title = locale === "fa" ? photo.title_fa || photo.title : photo.title;
  const price = photo.price * (license === "extended" ? 3 : 1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <Reveal>
          <div className="overflow-hidden rounded-[2rem] border border-line bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(photo.url)} alt={title} className="w-full object-cover" />
          </div>
        </Reveal>

        <Reveal i={1}>
          <div className="lg:sticky lg:top-24">
            <h1 className="text-3xl font-black tracking-tight">{title}</h1>
            <p className="mt-3 leading-8 text-muted">{photo.description}</p>

            {photo.author && (
              <Link href={`/${locale}/creators/${photo.author.id}`}
                className="mt-5 flex items-center gap-3 rounded-3xl border border-line bg-surface/60 p-3 transition hover:bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.author.avatar} alt={photo.author.name} className="size-12 rounded-2xl object-cover" />
                <div>
                  <p className="text-sm font-bold">{photo.author.name}</p>
                  <p className="text-xs text-muted">{photo.author.city} · {dateLabel(photo.created_at, locale)}</p>
                </div>
              </Link>
            )}

            <div className="mt-4 flex gap-3 text-sm text-muted">
              <span className="flex items-center gap-1.5"><Heart className="size-4" />{num(photo.likes, locale)} {t.photo.likes}</span>
              <span className="flex items-center gap-1.5"><ShoppingBag className="size-4" />{num(photo.sales, locale)} {t.photo.sales}</span>
            </div>

            <div className="mt-6 space-y-2">
              {([["standard", t.photo.standard, t.photo.standardD, photo.price],
                 ["extended", t.photo.extended, t.photo.extendedD, photo.price * 3]] as const).map(([key, label, desc, p]) => (
                <button key={key} onClick={() => setLicense(key)}
                  className={`w-full rounded-3xl border p-4 text-start transition ${license === key ? "border-brand bg-brand/5 ring-4 ring-brand/10" : "border-line bg-surface/60 hover:bg-surface"}`}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-bold">{label}</span>
                    <span className="font-black text-brand">{money(p, locale)} {t.common.toman}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-6 text-muted">{desc}</span>
                </button>
              ))}
            </div>

            {status === "done" ? (
              <div className="mt-5 flex items-center gap-3 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="size-5" /> {t.photo.bought}
                <a href={mediaUrl(photo.url)} target="_blank" rel="noreferrer" className="ms-auto inline-flex items-center gap-1 underline">
                  <Download className="size-4" /> {t.photo.download}
                </a>
              </div>
            ) : (
              <Button size="lg" className="mt-5 w-full" onClick={buy} disabled={status === "busy"}>
                <ShoppingBag className="size-4" /> {t.photo.buy} — {money(price, locale)} {t.common.toman}
              </Button>
            )}
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            {photo.tags.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold text-muted"><Tag className="size-3.5" />{t.photo.tags}</p>
                <div className="flex flex-wrap gap-2">
                  {photo.tags.map((tag) => (
                    <Link key={tag} href={`/${locale}/explore?q=${encodeURIComponent(tag)}`}
                      className="rounded-xl bg-ink/5 px-3 py-1.5 text-xs text-muted transition hover:bg-ink/10 dark:bg-white/10 dark:hover:bg-white/15">
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>

      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-extrabold">{t.photo.similar}</h2>
        <Masonry>{similar.filter((p) => p.id !== photo.id).map((p, i) => <PhotoCard key={p.id} photo={p} i={i} />)}</Masonry>
      </section>
    </div>
  );
}
