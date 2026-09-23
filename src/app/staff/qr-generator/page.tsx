"use client";

import { useState } from "react";
import { generateQrToken } from "@/lib/qrToken";

export default function GenerateQrPage() {
  const [customerId, setCustomerId] = useState("demo-customer");
  const [businessId, setBusinessId] = useState("demo-business");
  const [token, setToken] = useState<string | null>(null);

  const generate = () => {
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
