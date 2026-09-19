"use client";

import { useState, useEffect } from "react";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  customer: {
    name: string | null;
    phone: string;
    telegramUsername: string | null;
  };
  business: {
    name: string;
  };
};

export default function AdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/trpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Date.now(),
          json: { limit: 50, cursor: undefined },
          method: "query",
          path: ["admin", "listTickets"],
        }),
      });
      const json = await res.json();
      if (json.result?.items) {
        setTickets(json.result.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const res = await fetch("/api/trpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Date.now(),
          json: { ticketId, status },
          method: "mutation",
          path: ["admin", "updateTicketStatus"],
        }),
      });
      const json = await res.json();
      if (json.result?.success) {
        fetchTickets();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (!filter) return true;
    const search = filter.toLowerCase();
    return (
      ticket.subject.toLowerCase().includes(search) ||
      ticket.customer.name?.toLowerCase().includes(search) ||
      ticket.customer.phone.includes(search) ||
      ticket.business.name.toLowerCase().includes(search)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-red-100 text-red-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">LoyaltySphere</h1>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500">Admin</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
            <div className="text-sm text-gray-500">
              Total: {tickets.length}
            </div>
          </div>

          <div className="mb-6">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search tickets..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {filteredTickets.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tickets found</p>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${getStatusColor(ticket.status)}`}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  <p className="text-gray-700 mb-4">{ticket.message}</p>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Customer:</span>{" "}
                      {ticket.customer.name || ticket.customer.phone}
                      {ticket.customer.telegramUsername && (
                        <span> (@{ticket.customer.telegramUsername})</span>
                      )}
                      <span className="mx-2">•</span>
                      <span className="font-medium">Business:</span> {ticket.business.name}
                    </div>

                    <div className="flex gap-2">
                      {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                        <button
                          onClick={() => updateTicketStatus(ticket.id, "RESOLVED")}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Resolve
                        </button>
                      )}
                      {ticket.status !== "CLOSED" && (
                        <button
                          onClick={() => updateTicketStatus(ticket.id, "CLOSED")}
                          className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
