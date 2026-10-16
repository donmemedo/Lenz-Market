"use client";

import { motion } from "framer-motion";
import { Clock, Gift, Images } from "lucide-react";
import Link from "next/link";
import { mediaUrl, type Mission } from "@/lib/api";
import { daysLeft, money, num } from "@/lib/format";
import { useI18n } from "./locale";

export function MissionCard({ mission, i = 0 }: { mission: Mission; i?: number }) {
  const { t, locale } = useI18n();
  const left = daysLeft(mission.deadline);
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/${locale}/missions/${mission.id}`}
        className="card-hover group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="relative h-44 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(mission.cover)} alt={mission.title} loading="lazy" decoding="async"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <span className={`absolute top-3 rounded-full px-3 py-1 text-[11px] font-bold ltr:right-3 rtl:left-3 ${mission.is_open ? "bg-emerald-500 text-white" : "bg-black/60 text-white"}`}>
            {mission.is_open ? t.missions.open : t.missions.closed}
          </span>
          <div className="absolute bottom-3 flex items-center gap-2 text-white ltr:left-4 rtl:right-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(mission.brand_logo)} alt={mission.brand} className="size-8 rounded-xl border border-white/30 object-cover" />
            <span className="text-sm font-bold">{mission.brand}</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-lg font-bold leading-7">{locale === "fa" ? mission.title_fa : mission.title}</h3>
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-7 text-muted">
            {locale === "fa" ? mission.brief_fa : mission.brief}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-xs text-muted">
            <span className="flex items-center gap-1.5 font-bold text-ink">
              <Gift className="size-4 text-brand" />{money(mission.reward, locale)} {t.common.toman}
            </span>
            <span className="flex items-center gap-1.5"><Images className="size-4" />{num(mission.submissions, locale)}</span>
            <span className="flex items-center gap-1.5 ms-auto"><Clock className="size-4" />{num(left, locale)} {t.missions.days}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
