"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale";
import { MissionCard } from "@/components/mission-card";
import { Reveal, Skeleton } from "@/components/ui";
import { api, type Mission } from "@/lib/api";

export default function MissionsPage() {
  const { t } = useI18n();
  const [missions, setMissions] = useState<Mission[] | null>(null);
  useEffect(() => { void api<Mission[]>("/api/missions?limit=40").then(setMissions).catch(() => setMissions([])); }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Reveal>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl"><span className="gradient-text">{t.sections.missions}</span></h1>
        <p className="mt-2 max-w-xl text-muted">{t.sections.missionsSub}</p>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {missions === null
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80" />)
          : missions.map((m, i) => <MissionCard key={m.id} mission={m} i={i} />)}
      </div>
    </div>
  );
}
