"use client";

import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api, ApiError, loginPath, mediaUrl, type Photo } from "@/lib/api";
import { money, num } from "@/lib/format";
import { useI18n } from "./locale";
import { useAuth } from "./providers";
import { settle } from "./ui";

export function PhotoCard({ photo, i = 0 }: { photo: Photo; i?: number }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [liked, setLiked] = useState(photo.liked);
  const [likes, setLikes] = useState(photo.likes);
  const busy = useRef(false);
  const title = locale === "fa" ? photo.title_fa || photo.title : photo.title;

  const toggle = async () => {
    if (!user) { router.push(loginPath(locale, pathname)); return; }
    if (busy.current) return;           // one request in flight; the UI already shows the new state
    busy.current = true;
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      const res = await api<{ liked: boolean; likes: number }>(`/api/photos/${photo.id}/like`, { method: "POST" });
      setLiked(res.liked); setLikes(res.likes);
    } catch (e) {
      setLiked(!next); setLikes((n) => n + (next ? -1 : 1));
      if (e instanceof ApiError && e.status === 401) router.push(loginPath(locale, pathname));
    }
    finally { busy.current = false; }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...settle, delay: Math.min(i, 8) * 0.04 }}
      className="group relative mb-4 break-inside-avoid"
    >
      <Link href={`/${locale}/photo/${photo.id}`}
        className="card-hover relative block overflow-hidden rounded-3xl border border-line bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(photo.thumb || photo.url)} alt={title} loading="lazy" decoding="async"
          width={photo.width} height={photo.height}
          className="h-auto w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          style={{ aspectRatio: `${photo.width}/${photo.height}` }} />

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-coarse:opacity-100" />

        <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 pointer-coarse:translate-y-0 pointer-coarse:opacity-100">
          <h3 className="line-clamp-1 text-sm font-bold">{title}</h3>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="opacity-80">{photo.author?.name}</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Heart className="size-3" aria-hidden />{num(likes, locale)}</span>
              <span className="flex items-center gap-1 font-bold"><ShoppingBag className="size-3" aria-hidden />{money(photo.price, locale)}</span>
            </span>
          </div>
        </div>

        {photo.featured && (
          <span className="absolute top-3 rounded-full gradient-bg px-2.5 py-1 text-[10px] font-bold text-white ltr:left-3 rtl:right-3">
            ★ {t.sections.featured.split(" ")[0]}
          </span>
        )}
      </Link>

      {/* A sibling of the link (a button inside <a> is invalid and unreachable by keyboard). */}
      <motion.button type="button" onClick={toggle} aria-label={t.photo.like} aria-pressed={liked}
        whileTap={{ scale: 0.85 }} transition={settle}
        className="absolute top-3 grid size-10 place-items-center rounded-2xl bg-black/45 text-white transition-opacity duration-200 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 ltr:right-3 rtl:left-3 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-coarse:size-11">
        <Heart className={`size-4 transition-colors ${liked ? "fill-red-500 text-red-500" : ""}`} aria-hidden />
      </motion.button>
    </motion.div>
  );
}

export function Masonry({ children }: { children: React.ReactNode }) {
  return <div className="columns-2 gap-4 md:columns-3 xl:columns-4">{children}</div>;
}
