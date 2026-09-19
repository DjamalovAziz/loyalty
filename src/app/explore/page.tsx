"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useLocale } from "~/lib/i18n/context";

export default function ExplorePage() {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");

  const categories = api.business.categories.useQuery();
  const results = api.business.explore.useQuery({
    searchQuery: searchQuery || undefined,
    category: category || undefined,
    sortBy: "NEWEST",
  });

  return (
    <main className="min-h-screen bg-background mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">{t("explore.title")}</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        <input
          className="flex-1 rounded border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          placeholder={t("explore.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="rounded border border-border bg-card px-3 py-2 text-foreground"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">{t("explore.allCategories")}</option>
          {categories.data?.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <ul className="flex flex-col gap-2">
        {results.data?.businesses.map((b) => (
          <li key={b.id}>
            <Link
              href={`/b/${b.slug}`}
              className="block rounded border border-border bg-card p-4 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{b.name}</span>
                <span className="text-xs text-muted">{b.category}</span>
              </div>
              {b.description && <p className="mt-1 text-sm text-muted">{b.description}</p>}
              <div className="mt-2 flex gap-3 text-xs text-muted">
                {b.welcomePoints > 0 && <span>🎁 {b.welcomePoints} pts</span>}
                {b.minCashback > 0 && <span>💰 {b.minCashback}%+</span>}
                {b.distanceKm !== null && <span>📍 {b.distanceKm} km</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {results.data?.businesses.length === 0 && (
        <p className="text-sm text-muted">{t("explore.noResults")}</p>
      )}
    </main>
  );
}
