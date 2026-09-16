"use client";

import Link from "next/link";
import { useLocale } from "~/lib/i18n/context";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";

export default function HomePage() {
  const { t } = useLocale();
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-24 text-center">
      <div className="self-end">
        <LanguageSwitcher />
      </div>
      <h1 className="text-3xl font-bold">{t("landing.title")}</h1>
      <p className="text-gray-600">{t("landing.description")}</p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-white hover:bg-gray-700"
        >
          {t("landing.cta")}
        </Link>
      </div>
    </main>
  );
}
