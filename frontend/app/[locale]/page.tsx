import { Home } from "@/components/home";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <Home locale={locale} />;
}
