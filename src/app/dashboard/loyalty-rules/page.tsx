"use client";

import { useEffect, useState } from "react";

export default function LoyaltyRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trpc/owner.myBusiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then((data) => {
        const biz = data.result?.data;
        if (!biz?.id) return;
        setBusinessId(biz.id);
        return fetch("/api/trpc/loyaltyRule.list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: biz.id }),
        });
      })
      .then((r) => r?.json())
      .then((data) => setRules(data?.result?.data || []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Loyalty Rules</h1>
      {!businessId && <p>Загрузка...</p>}
      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="border rounded p-3">
            <p className="font-semibold">{rule.type}</p>
            <p className="text-sm text-gray-500">{rule.isActive ? "Active" : "Inactive"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
