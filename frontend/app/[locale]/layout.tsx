import { notFound } from "next/navigation";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LocaleProvider } from "@/components/locale";
import { locales } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as (typeof locales)[number])) notFound();
  const rtl = locale !== "en";
  return (
    <LocaleProvider locale={locale}>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang=${JSON.stringify(locale)};document.documentElement.dir=${JSON.stringify(rtl ? "rtl" : "ltr")};`,
        }}
      />
      <Header locale={locale} />
      <main className="min-h-[70vh]">{children}</main>
      <Footer locale={locale} />
    </LocaleProvider>
  );
}
