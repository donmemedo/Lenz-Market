"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, LayoutDashboard, LogOut, Menu, Moon, Search, Sun, Upload, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useI18n } from "./locale";
import { useAuth } from "./providers";
import { Button } from "./ui";

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = (mounted ? resolvedTheme ?? theme : "dark") === "dark";
  return (
    <button
      aria-label="theme"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="relative grid size-10 place-items-center rounded-2xl border border-line bg-surface/60 backdrop-blur transition hover:bg-surface"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? "moon" : "sun"}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: 0.25 }}
          className="absolute"
        >
          {dark ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function LangSwitch({ locale }: { locale: string }) {
  const pathname = usePathname() || "/fa";
  const other = locale === "fa" ? "en" : "fa";
  const href = pathname.replace(/^\/(fa|en)/, `/${other}`) || `/${other}`;
  return (
    <Link
      href={href}
      className="grid h-10 place-items-center rounded-2xl border border-line bg-surface/60 px-3 text-xs font-bold backdrop-blur transition hover:bg-surface"
    >
      {other === "fa" ? "فا" : "EN"}
    </Link>
  );
}

export function Header({ locale }: { locale: string }) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: `/${locale}/explore`, label: t.nav.explore },
    { href: `/${locale}/missions`, label: t.nav.missions },
    { href: `/${locale}/creators`, label: t.nav.creators },
  ];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/${locale}/explore?q=${encodeURIComponent(q)}`);
    setOpen(false);
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? "py-2" : "py-4"}`}>
      <div className="mx-auto max-w-7xl px-4">
        <div className={`flex items-center gap-3 rounded-3xl px-3 transition-all duration-500 ${scrolled ? "glass py-2 shadow-xl shadow-black/5" : "py-2"}`}>
          <Link href={`/${locale}`} className="flex items-center gap-2.5 shrink-0">
            <span className="grid size-10 place-items-center rounded-2xl gradient-bg ring-glow">
              <Camera className="size-5 text-white" />
            </span>
            <span className="hidden text-lg font-extrabold tracking-tight sm:block">{t.brand}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href}
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-ink/5 hover:text-ink dark:hover:bg-white/10">
                {l.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={submit} className="relative mx-auto hidden max-w-sm flex-1 md:block">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted ltr:left-3.5 rtl:right-3.5" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.hero.search}
              className="h-10 w-full rounded-2xl border border-line bg-surface/60 text-sm outline-none backdrop-blur transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/15 ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4"
            />
          </form>

          <div className="ms-auto flex items-center gap-2">
            <ThemeToggle />
            <LangSwitch locale={locale} />
            {user ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Button href={`/${locale}/upload`} size="sm" variant="primary">
                  <Upload className="size-4" /> {t.nav.upload}
                </Button>
                <Link href={`/${locale}/dashboard`} className="grid size-10 place-items-center overflow-hidden rounded-2xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={user.avatar} alt={user.name} className="size-full object-cover" />
                </Link>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Button href={`/${locale}/login`} variant="ghost" size="sm">{t.cta.login}</Button>
                <Button href={`/${locale}/login?mode=signup`} size="sm">{t.cta.signup}</Button>
              </div>
            )}
            <button onClick={() => setOpen(true)} aria-label={t.common.menu}
              className="grid size-10 place-items-center rounded-2xl border border-line bg-surface/60 lg:hidden">
              <Menu className="size-[18px]" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
            <motion.div
              initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="glass m-3 rounded-3xl p-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="text-lg font-extrabold">{t.brand}</span>
                <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-2xl border border-line">
                  <X className="size-[18px]" />
                </button>
              </div>
              <form onSubmit={submit} className="relative mb-4">
                <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted ltr:left-3.5 rtl:right-3.5" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.hero.search}
                  className="h-12 w-full rounded-2xl border border-line bg-surface/70 text-sm outline-none ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4" />
              </form>
              <div className="grid gap-1">
                {links.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                    className="rounded-2xl px-4 py-3 text-base font-medium transition hover:bg-ink/5 dark:hover:bg-white/10">
                    {l.label}
                  </Link>
                ))}
              </div>
              <div className="mt-4 grid gap-2">
                {user ? (
                  <>
                    <Button href={`/${locale}/upload`} size="lg" className="w-full"><Upload className="size-4" />{t.nav.upload}</Button>
                    <Button href={`/${locale}/dashboard`} variant="ghost" size="lg" className="w-full">
                      <LayoutDashboard className="size-4" />{t.nav.dashboard}
                    </Button>
                    <Button variant="soft" size="lg" className="w-full" onClick={() => { logout(); setOpen(false); }}>
                      <LogOut className="size-4" />{t.cta.logout}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button href={`/${locale}/login?mode=signup`} size="lg" className="w-full">{t.cta.signup}</Button>
                    <Button href={`/${locale}/login`} variant="ghost" size="lg" className="w-full">{t.cta.login}</Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
