"use client";

import { useEffect, useState } from "react";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  createdAt: string;
};

export default function AnalyticsPage() {
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
        return fetch("/api/trpc/analytics.businessOverview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: biz.id }),
        });
      })
      .then((r) => r?.json())
      .then((data) => {
        const d = data?.result?.data;
        if (!d) return;
        setTotalCustomers(d.totalCustomers || 0);
        setTotalPoints(d.totalPoints || 0);
        setTransactions(d.transactions || []);
      });
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Аналитика</h1>
      {!businessId && <p>Загрузка...</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded p-4">
          <p className="text-sm text-gray-500">Клиентов</p>
          <p className="text-2xl font-bold">{totalCustomers}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-500">Баллов в обращении</p>
          <p className="text-2xl font-bold">{totalPoints}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-500">Транзакций</p>
          <p className="text-2xl font-bold">{transactions.length}</p>
        </div>
      </div>
      <div className="border rounded">
        <div className="p-4 border-b font-semibold">Последние транзакции</div>
        <div className="divide-y">
          {transactions.slice(0, 20).map((tx) => (
            <div key={tx.id} className="p-3 flex justify-between text-sm">
              <span>{tx.type}</span>
              <span>{tx.amount}</span>
              <span className="text-gray-500">{new Date(tx.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
