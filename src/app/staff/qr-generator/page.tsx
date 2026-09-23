"use client";

import { useEffect, useState } from "react";
import { generateQrToken } from "@/lib/qrToken";

export default function GenerateQrPage() {
  const [customerId, setCustomerId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trpc/owner.myBusiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: {} }),
    })
      .then((r) => r.json())
      .then((data) => {
        const biz = data.result?.data;
        if (biz?.id) setBusinessId(biz.id);
      });
  }, []);

  const generate = () => {
    if (!businessId || !customerId) return;
    const t = generateQrToken(customerId, businessId, 60);
    setToken(t);
  };

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-2xl font-bold">QR Generator</h1>
      <input
        className="w-full border rounded p-2"
        placeholder="Customer ID"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
      />
      <input
        className="w-full border rounded p-2"
        placeholder="Business ID"
        value={businessId}
        onChange={(e) => setBusinessId(e.target.value)}
      />
      <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={generate}>
        Generate
      </button>
      {token && <p className="break-all">{token}</p>}
    </div>
  );
}
