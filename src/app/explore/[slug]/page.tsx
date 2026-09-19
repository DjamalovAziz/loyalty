"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  logo: string | null;
  welcomePoints: number;
  minimumCashback: number;
  telegramGroup: string | null;
};

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [action, setAction] = useState<"join" | "leave" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBusiness = useCallback(async () => {
    try {
      const res = await fetch(`/api/trpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Date.now(),
          json: { id: params.slug },
          method: "query",
          path: ["business", "getById"],
        }),
      });
      const json = await res.json();
      if (json.result?.business) {
        setBusiness(json.result.business);
      }
    } catch {
      console.error();
    } finally {
      setLoading(false);
    }
  }, [params.slug]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const handleJoin = async () => {
    if (!customerId.trim()) {
      setMessage({ type: "error", text: "Please enter your customer ID" });
      return;
    }

    setAction("join");
    setMessage(null);

    try {
      const res = await fetch("/api/trpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Date.now(),
          json: { customerId, businessId: business!.id },
          method: "mutation",
          path: ["customer", "join"],
        }),
      });
      const json = await res.json();
      if (json.result?.success) {
        setMessage({ type: "success", text: "Successfully joined loyalty program!" });
      } else {
        setMessage({ type: "error", text: json.result?.error || "Failed to join" });
      }
    } catch {
      setMessage({ type: "error", text: "Error joining program" });
    } finally {
      setAction(null);
    }
  };

  const handleLeave = async () => {
    if (!customerId.trim()) {
      setMessage({ type: "error", text: "Please enter your customer ID" });
      return;
    }

    setAction("leave");
    setMessage(null);

    try {
      const res = await fetch("/api/trpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Date.now(),
          json: { customerId, businessId: business!.id },
          method: "mutation",
          path: ["customer", "leave"],
        }),
      });
      const json = await res.json();
      if (json.result?.success) {
        setMessage({ type: "success", text: "Left loyalty program" });
      } else {
        setMessage({ type: "error", text: json.result?.error || "Failed to leave" });
      }
    } catch {
      setMessage({ type: "error", text: "Error leaving program" });
    } finally {
      setAction(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Business not found</p>
          <button
            onClick={() => router.push("/explore")}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">LoyaltySphere</h1>
              <button
                onClick={() => router.push("/explore")}
                className="text-gray-500 hover:text-gray-900"
              >
                Explore
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/me" className="text-gray-500 hover:text-gray-900">My Account</a>
              <a href="/support" className="text-gray-500 hover:text-gray-900">Support</a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{business.name}</h1>
                  <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                    {business.category}
                  </span>
                </div>
                {business.logo && (
                  <Image
                    src={business.logo}
                    alt={business.name}
                    width={80}
                    height={80}
                    className="rounded-lg"
                  />
                )}
              </div>

              {business.description && (
                <p className="mt-4 text-gray-600">{business.description}</p>
              )}

              <div className="mt-6 space-y-3">
                {business.address && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {business.address}
                  </div>
                )}
                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Welcome bonus: {business.welcomePoints} points
                </div>
                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Minimum cashback: {business.minimumCashback} points
                </div>
              </div>

              <div className="mt-8 border-t pt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Join Loyalty Program</h2>

                {message && (
                  <div
                    className={`mb-4 px-4 py-3 rounded ${
                      message.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer ID
                    </label>
                    <input
                      type="text"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      placeholder="Enter your customer ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleJoin}
                      disabled={action === "join"}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {action === "join" ? "Joining..." : "Join Program"}
                    </button>
                    <button
                      onClick={handleLeave}
                      disabled={action === "leave"}
                      className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-md hover:bg-gray-300 disabled:opacity-50"
                    >
                      {action === "leave" ? "Leaving..." : "Leave Program"}
                    </button>
                  </div>
                </div>
              </div>

              {business.telegramGroup && (
                <div className="mt-6 border-t pt-6">
                  <a
                    href={business.telegramGroup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                    </svg>
                    Join Telegram Group
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
