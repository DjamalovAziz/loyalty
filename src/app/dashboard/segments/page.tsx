"use client";

import { useEffect, useState } from "react";

export default function ReferralsPage() {
  const [segments, setSegments] = useState<any[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trpc/owner.myBusiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: {} }),
    })
      .then((r) => r.json())
      .then((data) => {
        const biz = data.result?.data;
        if (!biz?.id) return;
        setBusinessId(biz.id);
        return fetch("/api/trpc/segmentation.list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: { businessId: biz.id } }),
        });
      })
      .then((r) => r?.json())
      .then((data) => setSegments(data?.result?.data || []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Сегменты</h1>
      {!businessId && <p>Загрузка...</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {segments.map((s) => (
          <div key={s.id} className="border rounded p-3">
            <p className="font-semibold">{s.segment}</p>
            <p className="text-sm text-gray-500">{s.customer?.phone}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
