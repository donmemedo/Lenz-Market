"use client";

import { Clock, Gift, Images, Upload } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale";
import { Masonry, PhotoCard } from "@/components/photo-card";
import { Button, Reveal, Skeleton } from "@/components/ui";
import { api, mediaUrl, type Mission, type Photo } from "@/lib/api";
import { daysLeft, money, num } from "@/lib/format";

export default function MissionPage() {
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    void api<Mission>(`/api/missions/${id}`).then(setMission).catch(() => {});
    void api<Photo[]>(`/api/missions/${id}/photos`).then(setPhotos).catch(() => {});
  }, [id]);

  if (!mission) return <div className="mx-auto max-w-7xl px-4 py-10"><Skeleton className="h-96 w-full" /></div>;

  const stats = [
    { icon: Gift, label: t.missions.reward, value: `${money(mission.reward, locale)} ${t.common.toman}` },
    { icon: Images, label: t.missions.submissions, value: num(mission.submissions, locale) },
    { icon: Clock, label: t.missions.deadline, value: `${num(daysLeft(mission.deadline), locale)} ${t.missions.days}` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(mission.cover)} alt={mission.title} className="h-64 w-full object-cover sm:h-96" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-10">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(mission.brand_logo)} alt={mission.brand} className="size-12 rounded-2xl border border-white/30 object-cover" />
              <div>
                <p className="text-sm opacity-80">{mission.brand}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${mission.is_open ? "bg-emerald-500" : "bg-black/60"}`}>
                  {mission.is_open ? t.missions.open : t.missions.closed}
                </span>
              </div>
            </div>
            <h1 className="mt-4 text-3xl font-black sm:text-5xl">{locale === "fa" ? mission.title_fa : mission.title}</h1>
          </div>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Reveal>
          <div className="rounded-3xl border border-line bg-surface/60 p-7 backdrop-blur">
            <h2 className="text-lg font-bold">{t.missions.brief}</h2>
            <p className="mt-3 leading-9 text-muted">{locale === "fa" ? mission.brief_fa : mission.brief}</p>
          </div>
        </Reveal>
        <Reveal i={1}>
          <div className="rounded-3xl border border-line bg-surface/60 p-7 backdrop-blur">
            <div className="space-y-4">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-brand/10 text-brand"><s.icon className="size-5" /></span>
                  <div>
                    <p className="text-xs text-muted">{s.label}</p>
                    <p className="font-bold">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button href={`/${locale}/upload?mission=${mission.id}`} size="lg" className="mt-6 w-full">
              <Upload className="size-4" /> {t.missions.join}
            </Button>
          </div>
        </Reveal>
      </div>

      {photos.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 text-2xl font-extrabold">{t.missions.entries}</h2>
          <Masonry>{photos.map((p, i) => <PhotoCard key={p.id} photo={p} i={i} />)}</Masonry>
        </section>
      )}
    </div>
  );
}
