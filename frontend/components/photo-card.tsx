"use client";

import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api, mediaUrl, type Photo } from "@/lib/api";
import { money, num } from "@/lib/format";
import { useI18n } from "./locale";
import { useAuth } from "./providers";

export function PhotoCard({ photo, i = 0 }: { photo: Photo; i?: number }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [liked, setLiked] = useState(photo.liked);
  const [likes, setLikes] = useState(photo.likes);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { window.location.href = `/${locale}/login`; return; }
    const optimistic = !liked;
    setLiked(optimistic);
    setLikes((n) => n + (optimistic ? 1 : -1));
    try {
      const res = await api<{ liked: boolean; likes: number }>(`/api/photos/${photo.id}/like`, { method: "POST" });
      setLiked(res.liked); setLikes(res.likes);
    } catch { setLiked(!optimistic); setLikes((n) => n + (optimistic ? -1 : 1)); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: Math.min(i, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="mb-4 break-inside-avoid"
    >
      <Link href={`/${locale}/photo/${photo.id}`}
        className="card-hover group relative block overflow-hidden rounded-3xl border border-line bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(photo.thumb || photo.url)} alt={locale === "fa" ? photo.title_fa || photo.title : photo.title}
          loading="lazy"
          className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          style={{ aspectRatio: `${photo.width}/${photo.height}` }} />

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <button onClick={toggle} aria-label="like"
          className="absolute top-3 grid size-9 place-items-center rounded-2xl bg-black/35 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 ltr:right-3 rtl:left-3">
          <Heart className={`size-4 transition ${liked ? "fill-red-500 text-red-500" : ""}`} />
        </button>

        <div className="absolute inset-x-0 bottom-0 translate-y-3 p-4 text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <h3 className="line-clamp-1 text-sm font-bold">{locale === "fa" ? photo.title_fa || photo.title : photo.title}</h3>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="opacity-80">{photo.author?.name}</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Heart className="size-3" />{num(likes, locale)}</span>
              <span className="flex items-center gap-1 font-bold"><ShoppingBag className="size-3" />{money(photo.price, locale)}</span>
            </span>
          </div>
        </div>

        {photo.featured && (
          <span className="absolute top-3 rounded-full gradient-bg px-2.5 py-1 text-[10px] font-bold text-white ltr:left-3 rtl:right-3">
            ★ {t.sections.featured.split(" ")[0]}
          </span>
        )}
      </Link>
    </motion.div>
  );
}

export function Masonry({ children }: { children: React.ReactNode }) {
  return <div className="columns-2 gap-4 md:columns-3 xl:columns-4">{children}</div>;
}
