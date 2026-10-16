"use client";

import { Check, ImagePlus, Loader2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/locale";
import { useAuth } from "@/components/providers";
import { Button, Notice, Reveal } from "@/components/ui";
import { api, mediaUrl, type Category, type Mission, type Photo, type Upload } from "@/lib/api";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 12 * 1024 * 1024;

function UploadInner() {
  const { t, locale } = useI18n();
  const { locale: loc } = useParams<{ locale: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user, ready } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cats, setCats] = useState<Category[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [preview, setPreview] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Photo | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "", title_fa: "", description: "", category: "nature",
    tags: "", price: 190000, mission_id: search.get("mission") ?? "",
  });

  useEffect(() => { if (ready && !user) router.replace(`/${loc}/login`); }, [ready, user, router, loc]);
  useEffect(() => {
    void api<Category[]>("/api/categories").then(setCats).catch(() => {});
    void api<Mission[]>("/api/missions?limit=20").then(setMissions).catch(() => {});
  }, []);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (file?: File) => {
    if (!file) return;
    setError(""); setUrl("");
    // Validate inline before spending the upload; the API re-checks the actual bytes.
    if (!TYPES.includes(file.type) || file.size > MAX_BYTES) { setError(t.upload.fileHint); return; }
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      setUrl((await api<Upload>("/api/upload", { method: "POST", body })).url);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) { setError(t.upload.sub); return; }
    setBusy(true); setError("");
    try {
      const photo = await api<Photo>("/api/photos", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          tags: form.tags.split(/[,،]/).map((s) => s.trim()).filter(Boolean).slice(0, 15),
          mission_id: form.mission_id ? Number(form.mission_id) : null,
          url,
        }),
      });
      setDone(photo);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  const input = "h-12 w-full rounded-2xl border border-line bg-surface/70 px-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="glass rounded-[2rem] p-10">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl gradient-bg text-white ring-glow"><Check className="size-8" /></span>
          <h1 className="mt-6 text-2xl font-black">{t.upload.success}</h1>
          <div className="mt-6 overflow-hidden rounded-3xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(done.url)} alt="" className="max-h-72 w-full object-cover" />
          </div>
          <div className="mt-6 flex justify-center gap-2">
            <Button href={`/${loc}/photo/${done.id}`}>{t.upload.view}</Button>
            <Button href={`/${loc}/dashboard`} variant="ghost">{t.nav.dashboard}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Reveal>
        <h1 className="text-4xl font-black tracking-tight"><span className="gradient-text">{t.upload.title}</span></h1>
        <p className="mt-2 text-muted">{t.upload.sub}</p>
      </Reveal>

      <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <button type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files?.[0]); }}
            className="group grid min-h-80 w-full place-items-center overflow-hidden rounded-[2rem] border-2 border-dashed border-line bg-surface/50 p-6 transition hover:border-brand hover:bg-surface">
            {preview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={preview} alt="" className="max-h-96 w-full rounded-2xl object-cover" />
            ) : (
              <div className="text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-brand/10 text-brand transition group-hover:gradient-bg group-hover:text-white">
                  <ImagePlus className="size-7" />
                </span>
                <p className="mt-4 font-bold">{t.upload.pick}</p>
                <p className="mt-1 text-sm text-muted">{t.upload.sub}</p>
                <p className="mt-1 text-xs text-muted">{t.upload.fileHint}</p>
              </div>
            )}
          </button>
          <input ref={fileRef} type="file" accept={TYPES.join(",")} hidden onChange={(e) => pick(e.target.files?.[0])} />
        </Reveal>

        <Reveal i={1}>
          <div className="space-y-4">
            <input className={input} aria-label={t.upload.name} placeholder={t.upload.name} required maxLength={120} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className={input} aria-label={t.upload.nameFa} placeholder={t.upload.nameFa} maxLength={120} value={form.title_fa}
              onChange={(e) => setForm({ ...form, title_fa: e.target.value })} />
            <textarea className={`${input} h-28 py-3`} aria-label={t.upload.desc} placeholder={t.upload.desc} maxLength={2000} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <select className={input} aria-label={t.upload.category} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {cats.map((c) => <option key={c.slug} value={c.slug}>{locale === "fa" ? c.fa : c.en}</option>)}
              </select>
              <input className={input} type="number" inputMode="numeric" min={10000} max={500000000} step={10000} aria-label={t.upload.price} placeholder={t.upload.price}
                value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <input className={input} aria-label={t.upload.tags} placeholder={t.upload.tags} value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            <select className={input} aria-label={t.upload.mission} value={form.mission_id} onChange={(e) => setForm({ ...form, mission_id: e.target.value })}>
              <option value="">{t.upload.none}</option>
              {missions.map((m) => <option key={m.id} value={m.id}>{locale === "fa" ? m.title_fa : m.title} — {m.brand}</option>)}
            </select>

            {error && <Notice>{error}</Notice>}

            <Button type="submit" size="lg" className="w-full" disabled={busy || !url}>
              {busy && <Loader2 className="size-4 animate-spin" />}{t.upload.submit}
            </Button>
          </div>
        </Reveal>
      </form>
    </div>
  );
}

export default function UploadPage() {
  return <Suspense fallback={<div className="p-20" />}><UploadInner /></Suspense>;
}
