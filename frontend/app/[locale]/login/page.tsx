"use client";

import { Camera, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useI18n } from "@/components/locale";
import { useAuth } from "@/components/providers";
import { Button, Notice } from "@/components/ui";

// The shared demo login exists only where the API seeds it (never in production builds).
const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

function Field({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      <input {...props} aria-describedby={hint ? `${props.name}-hint` : undefined}
        className="h-12 w-full rounded-2xl border border-line bg-surface/70 px-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 user-invalid:border-red-500" />
      {hint && <span id={`${props.name}-hint`} className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function LoginInner() {
  const { t } = useI18n();
  const { locale } = useParams<{ locale: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState(search.get("mode") === "signup" ? "signup" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      if (mode === "signup") await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
      router.push(`/${locale}/dashboard`);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  const demo = async () => {
    setBusy(true); setError("");
    try { await login("demo@qaab.ir", "demo1234"); router.push(`/${locale}/dashboard`); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  const signup = mode === "signup";

  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
      <div className="hidden lg:block">
        <div className="relative overflow-hidden rounded-[2.5rem] gradient-bg p-12 text-white ring-glow">
          <Camera className="size-12" />
          <h2 className="mt-8 text-4xl font-black leading-tight">{t.cta.sell}</h2>
          <p className="mt-4 leading-8 opacity-90">{t.hero.sub}</p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {t.how.map((s) => (
              <div key={s.t} className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <p className="text-sm font-bold">{s.t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-8 sm:p-10">
        <h1 className="text-3xl font-black">{signup ? t.auth.signupT : t.auth.loginT}</h1>
        <p className="mt-2 text-sm text-muted">{signup ? t.auth.signupS : t.auth.loginS}</p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {signup && (
            <Field label={t.auth.name} name="name" autoComplete="name" maxLength={80} value={form.name} required
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          )}
          <Field label={t.auth.email} name="email" type="email" autoComplete="email" maxLength={254} value={form.email} required dir="ltr"
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Field label={t.auth.password} name="password" type="password" value={form.password} required dir="ltr"
            minLength={signup ? 8 : 1} maxLength={128} hint={signup ? t.auth.passwordHint : undefined}
            autoComplete={signup ? "new-password" : "current-password"}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />

          {error && <Notice>{error}</Notice>}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {signup ? t.cta.signup : t.cta.login}
          </Button>
          {DEMO && (
            <Button type="button" variant="ghost" size="lg" className="w-full" onClick={demo} disabled={busy}>
              {t.auth.demo}
            </Button>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {signup ? t.auth.haveAccount : t.auth.noAccount}{" "}
          <button type="button" onClick={() => { setMode(signup ? "login" : "signup"); setError(""); }}
            className="font-bold text-brand hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40 rounded-lg">
            {signup ? t.cta.login : t.cta.signup}
          </button>
        </p>
        <p className="mt-4 text-center text-xs leading-6 text-muted">
          {t.auth.terms} <Link href="#" className="underline">{t.footer.terms}</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="p-20" />}><LoginInner /></Suspense>;
}
