"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale";
import { Masonry, PhotoCard } from "@/components/photo-card";
import { Button, Reveal, Skeleton } from "@/components/ui";
import { api, mediaUrl, type Photo, type PublicUser } from "@/lib/api";
import { num } from "@/lib/format";

export default function CreatorPage() {
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ user: PublicUser; photos: Photo[] } | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    void api<{ user: PublicUser; photos: Photo[] }>(`/api/creators/${id}`).then(setData).catch(() => setMissing(true));
  }, [id]);

  if (missing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-lg font-bold">{t.common.missing}</p>
        <Button href={`/${locale}/creators`} variant="ghost" className="mt-6">{t.nav.creators}</Button>
      </div>
    );
  }
  if (!data) return <div className="mx-auto max-w-7xl px-4 py-10"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Reveal>
        <div className="glass flex flex-col items-center gap-5 rounded-[2rem] p-8 text-center sm:flex-row sm:text-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(data.user.avatar)} alt={data.user.name} className="size-24 rounded-3xl object-cover ring-4 ring-brand/30" />
          <div>
            <h1 className="text-3xl font-black">{data.user.name}</h1>
            <p className="mt-1 text-muted">{data.user.city} · {num(data.photos.length, locale)} {t.explore.results}</p>
            <p className="mt-3 max-w-xl leading-8 text-muted">{data.user.bio}</p>
          </div>
        </div>
      </Reveal>
      <div className="mt-10">
        <Masonry>{data.photos.map((p, i) => <PhotoCard key={p.id} photo={p} i={i} />)}</Masonry>
      </div>
    </div>
  );
}
