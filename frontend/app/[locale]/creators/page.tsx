"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale";
import { Reveal, Skeleton } from "@/components/ui";
import { api, type User } from "@/lib/api";

export default function CreatorsPage() {
  const { t, locale } = useI18n();
  const [creators, setCreators] = useState<User[] | null>(null);
  useEffect(() => { void api<User[]>("/api/creators?limit=24").then(setCreators).catch(() => setCreators([])); }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Reveal>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl"><span className="gradient-text">{t.sections.creators}</span></h1>
        <p className="mt-2 text-muted">{t.sections.creatorsSub}</p>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {creators === null
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-40" />)
          : creators.map((c, i) => (
            <Reveal key={c.id} i={i}>
              <Link href={`/${locale}/creators/${c.id}`}
                className="card-hover flex h-full flex-col gap-3 rounded-3xl border border-line bg-surface/60 p-5 backdrop-blur">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.avatar} alt={c.name} className="size-14 rounded-2xl object-cover ring-2 ring-brand/30" />
                  <div>
                    <p className="font-bold">{c.name}</p>
                    <p className="text-xs text-muted">{c.city}</p>
                  </div>
                </div>
                <p className="line-clamp-2 text-sm leading-7 text-muted">{c.bio}</p>
              </Link>
            </Reveal>
          ))}
      </div>
    </div>
  );
}
