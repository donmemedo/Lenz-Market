"use client";

import { SlidersHorizontal } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useI18n } from "@/components/locale";
import { Masonry, PhotoCard } from "@/components/photo-card";
import { Reveal, Skeleton } from "@/components/ui";
import { api, type Category, type Photo } from "@/lib/api";
import { num } from "@/lib/format";

function ExploreInner() {
  const { t, locale } = useI18n();
  const params = useParams<{ locale: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const q = search.get("q") ?? "";
  const category = search.get("category") ?? "";
  const sort = search.get("sort") ?? "trending";

  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => { void api<Category[]>("/api/categories").then(setCats).catch(() => {}); }, []);
  useEffect(() => {
    setPhotos(null);
    void api<Photo[]>(`/api/photos?${new URLSearchParams({ limit: "60", q, category, sort })}`)
      .then(setPhotos).catch(() => setPhotos([]));
  }, [q, category, sort]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`/${params.locale}/explore?${next.toString()}`);
  };

  const sorts = [
    ["trending", t.explore.trending], ["newest", t.explore.newest],
    ["popular", t.explore.popular], ["price_low", t.explore.priceLow], ["price_high", t.explore.priceHigh],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Reveal>
        <h1 className="text-4xl font-black ltr:tracking-tight sm:text-5xl">
          {q ? `“${q}”` : <span className="gradient-text">{t.explore.title}</span>}
        </h1>
        <p className="mt-2 text-muted">{t.explore.sub}</p>
      </Reveal>

      <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setParam("category", "")} aria-pressed={!category}
          className={`min-h-10 shrink-0 rounded-2xl border px-4 text-sm font-medium transition active:scale-[.97] pointer-coarse:min-h-11 ${!category ? "gradient-bg border-transparent text-white" : "border-line bg-surface/60 hover:bg-surface"}`}>
          {t.explore.all}
        </button>
        {cats.map((c) => (
          <button key={c.slug} type="button" onClick={() => setParam("category", c.slug)} aria-pressed={category === c.slug}
            className={`min-h-10 shrink-0 rounded-2xl border px-4 text-sm font-medium transition active:scale-[.97] pointer-coarse:min-h-11 ${category === c.slug ? "gradient-bg border-transparent text-white" : "border-line bg-surface/60 hover:bg-surface"}`}>
            {locale === "fa" ? c.fa : c.en}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-line pb-5">
        <span className="flex items-center gap-2 text-sm text-muted"><SlidersHorizontal className="size-4" />{t.explore.sort}</span>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {sorts.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setParam("sort", key)} aria-pressed={sort === key}
              className={`min-h-9 shrink-0 rounded-xl px-3 text-xs font-medium transition active:scale-[.97] pointer-coarse:min-h-11 ${sort === key ? "bg-ink text-bg" : "bg-ink/5 text-muted hover:bg-ink/10 dark:bg-white/10 dark:hover:bg-white/15"}`}>
              {label}
            </button>
          ))}
        </div>
        {photos && <span className="text-sm text-muted ms-auto">{num(photos.length, locale)} {t.explore.results}</span>}
      </div>

      <div className="mt-6">
        {photos === null ? (
          <Masonry>{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="mb-4 h-56 w-full" />)}</Masonry>
        ) : photos.length === 0 ? (
          <p className="py-24 text-center text-muted">{t.explore.empty}</p>
        ) : (
          <Masonry>{photos.map((p, i) => <PhotoCard key={p.id} photo={p} i={i} />)}</Masonry>
        )}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return <Suspense fallback={<div className="p-20" />}><ExploreInner /></Suspense>;
}
