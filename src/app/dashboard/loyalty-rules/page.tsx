"use client";

import { useEffect, useState } from "react";

export default function LoyaltyRulesPage() {
  const [rules, setRules] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/trpc/loyaltyRule.list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { businessId: "demo" } }),
    })
      .then((r) => r.json())
      .then((data) => setRules(data.result?.data || []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Loyalty Rules</h1>
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
