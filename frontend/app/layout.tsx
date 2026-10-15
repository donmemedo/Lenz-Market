import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "قاب | Qaab — بازار عکس ایرانی", template: "%s | قاب" },
  description:
    "قاب، بازار عکس ایرانی: عکس‌هایت را بفروش، در مأموریت برندها شرکت کن و درآمد بگیر. Qaab — the Iranian photo marketplace.",
  manifest: "/manifest.webmanifest",
  applicationName: "Qaab",
  appleWebApp: { capable: true, title: "Qaab", statusBarStyle: "black-translucent" },
  openGraph: { title: "قاب | Qaab", description: "بازار عکس ایرانی", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafc" },
    { media: "(prefers-color-scheme: dark)", color: "#08080e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;800;900&family=Outfit:wght@300..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain">
        <div className="aurora" aria-hidden><span /><span /><span /></div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
