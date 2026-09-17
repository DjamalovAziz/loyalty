"use client";

import Link from "next/link";
import { useLocale } from "~/lib/i18n/context";

export default function HomePage() {
  const { t } = useLocale();
  return (
    <main className="min-h-screen bg-background mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">{t("landing.title")}</h1>
      <p className="text-muted">{t("landing.description")}</p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded-lg bg-foreground px-5 py-2.5 text-background hover:opacity-90"
        >
          {t("landing.cta")}
        </Link>
        <Link
          href="/signin"
          className="rounded-lg border border-border px-5 py-2.5 text-foreground hover:bg-black/5 dark:hover:bg-white/10"
        >
          {t("landing.signinCta")}
        </Link>
      </div>
    </main>
  );
}
