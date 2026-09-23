"use client";

import { useEffect, useState } from "react";

type Customer = {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
};

export default function StaffPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [businessId] = useState("demo");
  const [staffAccountId, setStaffAccountId] = useState("staff");
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState<"redeem" | "earn">("redeem");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trpc/business.explore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { limit: 20, offset: 0 } }),
    })
      .then((r) => r.json())
      .then((data) => {
        const items = data.result?.data?.items || [];
        setCustomers(
          items.map((b: any) => ({
            id: b.id,
            phone: b.name || b.slug,
            firstName: b.name,
            lastName: null,
          }))
        );
      });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const endpoint = mode === "redeem" ? "staff.initiateRedeem" : "staff.earnPoints";
    const res = await fetch(`/api/trpc/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          businessId,
          staffAccountId,
          customerId: selectedCustomerId,
          amount,
          idempotencyKey: `${mode}:${selectedCustomerId}:${Date.now()}`,
        },
      }),
    });

    const data = await res.json();
    if (data.result?.success) {
      setMessage("Успешно");
    } else {
      setMessage(data.result?.error || "Ошибка");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Staff панель</h1>

      <form onSubmit={submit} className="space-y-3 max-w-md">
        <div>
          <label className="block text-sm font-medium">Staff Account ID</label>
          <input
            className="w-full border rounded p-2"
            value={staffAccountId}
            onChange={(e) => setStaffAccountId(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Клиент</label>
          <select
            className="w-full border rounded p-2"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            required
          >
            <option value="">Выберите клиента</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName || c.phone}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Режим</label>
          <select
            className="w-full border rounded p-2"
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
          >
            <option value="redeem">Списание</option>
            <option value="earn">Начисление</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Баллы</label>
          <input
            type="number"
            className="w-full border rounded p-2"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
            min={1}
          />
        </div>

        <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit">
          Выполнить
        </button>

        {message && <p>{message}</p>}
      </form>
    </div>
  );
}
