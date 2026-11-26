import Link from "next/link";
import { getDictionary } from "@/i18n";

export default function Home() {
  const t = getDictionary();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">{t.app.name}</h1>
      <p className="max-w-md text-balance opacity-70">{t.app.tagline}</p>
      <Link
        href="/find"
        className="mt-2 rounded-md bg-foreground px-5 py-2.5 font-medium text-background hover:opacity-90"
      >
        {t.nav.find}
      </Link>
      <p className="text-sm opacity-50">{t.app.phase}</p>
    </main>
  );
}
