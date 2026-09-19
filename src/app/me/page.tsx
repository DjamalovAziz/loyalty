"use client";

import { useState } from "react";

type Membership = {
  id: string;
  points: number;
  tier: string;
  isActive: boolean;
  business: {
    name: string;
    logo: string | null;
    category: string | null;
  };
};

type Customer = {
  id: string;
  name: string | null;
  phone: string;
  memberships: Membership[];
};

export default function MePage() {
  const [customerId, setCustomerId] = useState("");
  const [data, setData] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMe = async () => {
    if (!customerId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/trpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Date.now(),
          json: { customerId },
          method: "query",
          path: ["customer", "me"],
        }),
      });
      const json = await res.json();
      if (json.result?.data) {
        setData(json.result.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">LoyaltySphere</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/explore" className="text-gray-500 hover:text-gray-900">Explore</a>
              <a href="/support" className="text-gray-500 hover:text-gray-900">Support</a>
              <span className="text-gray-900 font-medium">My Account</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Memberships</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Enter your customer ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={fetchMe}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load"}
                </button>
              </div>
            </div>

            {data && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900">{data.name || "Customer"}</h3>
                  <p className="text-sm text-gray-500">{data.phone}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Active Memberships</h4>
                  {data.memberships.length === 0 ? (
                    <p className="text-gray-500">No active memberships</p>
                  ) : (
                    <div className="space-y-3">
                      {data.memberships.map((membership) => (
                        <div key={membership.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-gray-900">
                                {membership.business.name}
                              </h5>
                              <p className="text-sm text-gray-500">
                                Tier: {membership.tier}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-600">
                                {membership.points}
                              </p>
                              <p className="text-sm text-gray-500">points</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
