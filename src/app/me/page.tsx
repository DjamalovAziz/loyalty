"use client";

import { useEffect, useState } from "react";

type Membership = {
  id: string;
  points: number;
  tier: string;
  isActive: boolean;
  business: { name: string; slug: string };
};

export default function MePage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    fetch("/api/trpc/business.explore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { limit: 20, offset: 0 } }),
    })
      .then((r) => r.json())
      .then((data) => {
        const items = data.result?.data?.items || [];
        const mapped: Membership[] = items.map((b: any) => ({
          id: b.id,
          points: b.welcomePoints || 0,
          tier: "BRONZE",
          isActive: true,
          business: { name: b.name, slug: b.slug },
        }));
        setMemberships(mapped);
      });
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Мой кабинет</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {memberships.map((m) => (
          <div key={m.id} className="border rounded p-4">
            <h2 className="font-semibold">{m.business.name}</h2>
            <p>Баллов: {m.points}</p>
            <p>Уровень: {m.tier}</p>
            <p className="text-sm text-gray-500">{m.isActive ? "Активна" : "Неактивна"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
