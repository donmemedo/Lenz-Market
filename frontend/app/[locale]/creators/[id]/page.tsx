"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale";
import { Masonry, PhotoCard } from "@/components/photo-card";
import { Reveal, Skeleton } from "@/components/ui";
import { api, type Photo, type User } from "@/lib/api";
import { num } from "@/lib/format";

export default function CreatorPage() {
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ user: User; photos: Photo[] } | null>(null);
  useEffect(() => { void api<{ user: User; photos: Photo[] }>(`/api/creators/${id}`).then(setData).catch(() => {}); }, [id]);

  if (!data) return <div className="mx-auto max-w-7xl px-4 py-10"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Reveal>
        <div className="glass flex flex-col items-center gap-5 rounded-[2rem] p-8 text-center sm:flex-row sm:text-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.user.avatar} alt={data.user.name} className="size-24 rounded-3xl object-cover ring-4 ring-brand/30" />
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
