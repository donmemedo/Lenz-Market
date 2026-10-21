"use client";

import { Check, Download, Heart, Loader2, ShoppingBag, Tag } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale";
import { Masonry, PhotoCard } from "@/components/photo-card";
import { useAuth } from "@/components/providers";
import { Button, Notice, Reveal, Skeleton } from "@/components/ui";
import { api, ApiError, downloadPhoto, loginPath, mediaUrl, type Photo } from "@/lib/api";
import { dateLabel, money, num } from "@/lib/format";

type License = "standard" | "extended";

export default function PhotoPage() {
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, refresh } = useAuth();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [missing, setMissing] = useState(false);
  const [similar, setSimilar] = useState<Photo[]>([]);
  const [license, setLicense] = useState<License>("standard");
  const [step, setStep] = useState<"idle" | "confirm" | "busy">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    setPhoto(null); setMissing(false);
    void api<Photo>(`/api/photos/${id}`).then(async (p) => {
      setPhoto(p);
      setSimilar(await api<Photo[]>(`/api/photos?${new URLSearchParams({ category: p.category, limit: "8" })}`));
    }).catch(() => setMissing(true));
  }, [id, user?.id]); // re-read when the viewer changes: owned licenses depend on who is looking

  if (missing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-lg font-bold">{t.common.missing}</p>
        <Button href={`/${locale}/explore`} variant="ghost" className="mt-6">{t.cta.browse}</Button>
      </div>
    );
  }
  if (!photo) return <div className="mx-auto max-w-7xl px-4 py-10"><Skeleton className="h-[60vh] w-full" /></div>;

  const title = locale === "fa" ? photo.title_fa || photo.title : photo.title;
  const price = photo.price * (license === "extended" ? 3 : 1);
  const mine = !!user && photo.author?.id === user.id;
  const owned = photo.licenses.includes(license);
  const short = !!user && !owned && user.balance < price;

  const buy = async () => {
    if (!ready) return;
    if (!user) { router.push(loginPath(locale, pathname)); return; }
    if (step === "idle") { setStep("confirm"); setError(""); return; } // spending money is irreversible: confirm first
    setStep("busy");
    try {
      await api(`/api/photos/${id}/buy?license=${license}`, { method: "POST" });
      setPhoto({ ...photo, can_download: true, licenses: [...photo.licenses, license] });
      void refresh(); // wallet balance changed
    } catch (e) { setError((e as Error).message); }
    finally { setStep("idle"); }
  };

  const download = async () => {
    setError("");
    try { await downloadPhoto(photo.id); }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) router.push(loginPath(locale, pathname));
      else setError((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="overflow-hidden rounded-[2rem] border border-line bg-surface">
          {/* The page's main image: no fade-in wrapper, fetched first. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(photo.url)} alt={title} width={photo.width} height={photo.height} fetchPriority="high"
            className="h-auto w-full object-cover" style={{ aspectRatio: `${photo.width}/${photo.height}` }} />
        </div>

        <Reveal i={1}>
          <div className="lg:sticky lg:top-24">
            <h1 className="text-3xl font-black">{title}</h1>
            <p className="mt-3 leading-8 text-muted">{photo.description}</p>

            {photo.author && (
              <Link href={`/${locale}/creators/${photo.author.id}`}
                className="mt-5 flex items-center gap-3 rounded-3xl border border-line bg-surface/60 p-3 transition hover:bg-surface active:scale-[.99]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(photo.author.avatar)} alt={photo.author.name} className="size-12 rounded-2xl object-cover" />
                <div>
                  <p className="text-sm font-bold">{photo.author.name}</p>
                  <p className="text-xs text-muted">{photo.author.city} · {dateLabel(photo.created_at, locale)}</p>
                </div>
              </Link>
            )}

            <div className="mt-4 flex gap-3 text-sm text-muted">
              <span className="flex items-center gap-1.5"><Heart className="size-4" aria-hidden />{num(photo.likes, locale)} {t.photo.likes}</span>
              <span className="flex items-center gap-1.5"><ShoppingBag className="size-4" aria-hidden />{num(photo.sales, locale)} {t.photo.sales}</span>
            </div>

            {!mine && (
              <div className="mt-6 space-y-2">
                {([["standard", t.photo.standard, t.photo.standardD, photo.price],
                   ["extended", t.photo.extended, t.photo.extendedD, photo.price * 3]] as const).map(([key, label, desc, p]) => (
                  <button key={key} type="button" onClick={() => { setLicense(key); setStep("idle"); }} aria-pressed={license === key}
                    className={`w-full rounded-3xl border p-4 text-start transition active:scale-[.99] ${license === key ? "border-brand bg-brand/5 ring-4 ring-brand/10" : "border-line bg-surface/60 hover:bg-surface"}`}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-bold">{label}{photo.licenses.includes(key) && <Check className="ms-1.5 inline size-4 text-emerald-600" aria-label={t.photo.bought} />}</span>
                      <span className="font-black text-brand">{money(p, locale)} {t.common.toman}</span>
                    </span>
                    <span className="mt-1 block text-xs leading-6 text-muted">{desc}</span>
                  </button>
                ))}
                {user && <p className="px-1 text-xs text-muted">{t.photo.wallet}: <b className="text-ink">{money(user.balance, locale)} {t.common.toman}</b></p>}
              </div>
            )}

            {(mine || photo.can_download) && (
              <div role="status" className="mt-5 flex items-center gap-3 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                <Check className="size-5" aria-hidden /> {mine ? t.photo.owned : t.photo.bought}
                <button type="button" onClick={download} className="ms-auto inline-flex min-h-11 items-center gap-1 underline">
                  <Download className="size-4" aria-hidden /> {t.photo.download}
                </button>
              </div>
            )}

            {!mine && !owned && (
              step === "confirm" ? (
                <div className="mt-5 rounded-3xl border border-brand/40 bg-brand/5 p-4">
                  <p className="text-sm">{t.photo.payFrom}: <b>{money(price, locale)} {t.common.toman}</b></p>
                  <p className="mt-1 text-xs text-muted">{t.photo.after}: {money((user?.balance ?? 0) - price, locale)} {t.common.toman}</p>
                  <div className="mt-4 flex gap-2">
                    <Button size="lg" className="flex-1" onClick={buy}>{t.photo.confirm}</Button>
                    <Button size="lg" variant="ghost" onClick={() => setStep("idle")}>{t.photo.cancel}</Button>
                  </div>
                </div>
              ) : (
                <Button size="lg" className="mt-5 w-full" onClick={buy} disabled={step === "busy" || short}>
                  {step === "busy" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
                  {t.photo.buy} — {money(price, locale)} {t.common.toman}
                </Button>
              )
            )}
            {short && <div className="mt-3"><Notice>{t.photo.short}</Notice></div>}
            {error && <div className="mt-3"><Notice>{error}</Notice></div>}

            {photo.tags.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold text-muted"><Tag className="size-3.5" aria-hidden />{t.photo.tags}</p>
                <div className="flex flex-wrap gap-2">
                  {photo.tags.map((tag) => (
                    <Link key={tag} href={`/${locale}/explore?q=${encodeURIComponent(tag)}`}
                      className="inline-flex min-h-9 items-center rounded-xl bg-ink/5 px-3 text-xs text-muted transition hover:bg-ink/10 active:scale-95 pointer-coarse:min-h-11 dark:bg-white/10 dark:hover:bg-white/15">
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
