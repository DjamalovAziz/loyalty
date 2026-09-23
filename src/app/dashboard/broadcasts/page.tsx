"use client";

import { useEffect, useState } from "react";

export default function BroadcastsPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/trpc/broadcast.list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { businessId: "demo" } }),
    })
      .then((r) => r.json())
      .then((data) => setItems(data.result?.data || []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Broadcasts</h1>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="border rounded p-3">
            <p>{item.subject}</p>
            <p className="text-sm text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
