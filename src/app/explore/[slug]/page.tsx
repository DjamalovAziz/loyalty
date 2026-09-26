"use client";

import { useEffect, useState } from "react";
import { use } from "react";

type Business = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  logoUrl: string | null;
  welcomePoints: number;
  minimumCashback: number;
};

type Params = { slug: string };

export default function BusinessPage({ params }: { params: Promise<Params> }) {
  const { slug } = use(params);
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    fetch("/api/trpc/business.getBySlug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    })
      .then((r) => r.json())
      .then((data) => {
        setBusiness(data.result?.data || null);
      });
  }, [slug]);

  if (!business) return <p>Загрузка...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{business.name}</h1>
      {business.category && <p className="text-gray-500">{business.category}</p>}
      {business.description && <p>{business.description}</p>}
      {business.address && <p>{business.address}</p>}
      <div className="flex gap-4">
        <button className="px-4 py-2 bg-green-600 text-white rounded">Вступить</button>
        <button className="px-4 py-2 border rounded">Покинуть</button>
      </div>
    </div>
  );
}
