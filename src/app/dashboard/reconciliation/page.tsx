"use client";

import { useEffect, useState } from "react";

type Discrepancy = {
  membershipId: string;
  expected: number;
  actual: number;
  difference: number;
};

export default function ReconciliationPage() {
  const [result, setResult] = useState<{ totalMemberships: number; discrepancies: Discrepancy[]; isHealthy: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const run = async () => {
    if (!businessId) return;
    setLoading(true);
    const res = await fetch("/api/trpc/reconciliation.check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    const data = await res.json();
    setResult(data.result?.data || null);
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/trpc/owner.myBusiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then((data) => {
        const biz = data.result?.data;
        if (biz?.id) setBusinessId(biz.id);
      });
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reconciliation</h1>
      {!businessId && <p>Загрузка...</p>}
      <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={run} disabled={loading || !businessId}>
        {loading ? "Проверка..." : "Проверить балансы"}
      </button>
      {result && (
        <div>
          <p>Всего memberships: {result.totalMemberships}</p>
          <p>Статус: {result.isHealthy ? "✅ OK" : "❌ Расхождения"}</p>
          {result.discrepancies.length > 0 && (
            <div className="mt-4 space-y-2">
              {result.discrepancies.map((d) => (
                <div key={d.membershipId} className="border rounded p-3">
                  <p>Membership: {d.membershipId}</p>
                  <p>Ожидается: {d.expected}, фактически: {d.actual}, разница: {d.difference}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
