"use client";

import { useEffect, useState } from "react";

export default function TenantGuardPage() {
  const [status, setStatus] = useState<string>("checking");

  useEffect(() => {
    fetch("/api/trpc/business.explore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 1, offset: 0 }),
    })
      .then((r) => r.json())
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tenant guard</h1>
      <p>Status: {status}</p>
    </div>
  );
}
