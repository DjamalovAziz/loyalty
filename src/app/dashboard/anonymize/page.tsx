"use client";

import { useState } from "react";

export default function CustomerAnonymizePage() {
  const [customerId, setCustomerId] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/trpc/customer.anonymize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    const data = await res.json();
    setResult(data.result?.data?.success ? "Анонимизировано" : data.result?.data?.error || "Ошибка");
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Анонимизация клиента</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          placeholder="Customer ID"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          required
        />
        <button className="px-4 py-2 bg-red-600 text-white rounded" type="submit">
          Анонимизировать
        </button>
      </form>
      {result && <p>{result}</p>}
    </div>
  );
}
