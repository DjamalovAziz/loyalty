"use client";

import { locales, localeNames } from "~/lib/i18n/translations";
import { useLocale } from "~/lib/i18n/context";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <select
      aria-label="Language"
      className="rounded border bg-white px-2 py-1 text-sm text-gray-700"
      value={locale}
      onChange={(e) => setLocale(e.target.value as (typeof locales)[number])}
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  );
}
