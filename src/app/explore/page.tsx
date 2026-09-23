"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Business = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  logoUrl: string | null;
  welcomePoints: number;
  minimumCashback: number;
};

function ExploreContent() {
  const [items, setItems] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.get("q") || "";
    fetch("/api/trpc/business.explore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { query, limit: 20, offset: 0 } }),
    })
      .then((r) => r.json())
      .then((data) => {
        setItems(data.result?.data?.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Каталог бизнесов</h1>
      {loading && <p>Загрузка...</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((b) => (
          <a key={b.id} href={`/explore/${b.slug}`} className="border rounded p-4 block hover:shadow">
            <h2 className="font-semibold">{b.name}</h2>
            {b.category && <p className="text-sm text-gray-500">{b.category}</p>}
            {b.description && <p className="text-sm mt-2">{b.description}</p>}
            <p className="text-sm mt-2 text-green-600">+{b.welcomePoints} приветственных баллов</p>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<p>Загрузка...</p>}>
      <ExploreContent />
    </Suspense>
  );
}
