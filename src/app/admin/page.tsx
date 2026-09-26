"use client";

import { useEffect, useState } from "react";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  customer: { firstName: string | null; lastName: string | null; phone: string | null };
  business: { name: string; slug: string };
};

export default function AdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    fetch("/api/trpc/admin.listTickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: filter || undefined, limit: 50, offset: 0 }),
    })
      .then((r) => r.json())
      .then((data) => setTickets(data.result?.data?.items || []));
  }, [filter]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin поддержки</h1>
      <select
        className="border rounded p-2"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      >
        <option value="">Все статусы</option>
        <option value="OPEN">Open</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="RESOLVED">Resolved</option>
        <option value="CLOSED">Closed</option>
      </select>
      <div className="space-y-2">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="border rounded p-3">
            <div className="flex justify-between">
              <p className="font-semibold">{ticket.subject}</p>
              <span className="text-sm text-gray-500">{ticket.status}</span>
            </div>
            <p className="text-sm text-gray-600">
              {ticket.customer.firstName} {ticket.customer.lastName} ({ticket.customer.phone})
            </p>
            <p className="text-sm text-gray-500">{ticket.business.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
