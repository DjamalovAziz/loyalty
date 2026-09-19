"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  address: string | null;
  logo: string | null;
  welcomePoints: number;
  minimumCashback: number;
};

export default function ExplorePage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Date.now(),
          json: { query, category: category || undefined, limit: 20, cursor: undefined },
          method: "query",
          path: ["business", "explore"],
        }),
      });
      const json = await res.json();
      if (json.result?.items) {
        setBusinesses(json.result.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query, category]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">LoyaltySphere</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/explore" className="text-gray-900 font-medium">Explore</a>
              <a href="/me" className="text-gray-500 hover:text-gray-900">My Account</a>
              <a href="/support" className="text-gray-500 hover:text-gray-900">Support</a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Discover Local Businesses
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join loyalty programs and earn points at your favorite local spots.
          </p>

          <div className="max-w-2xl mx-auto flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search businesses..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="cafe">Cafe</option>
              <option value="restaurant">Restaurant</option>
              <option value="retail">Retail</option>
              <option value="salon">Salon</option>
              <option value="fitness">Fitness</option>
              <option value="other">Other</option>
            </select>
            <button
              onClick={fetchBusinesses}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center">
            <p className="text-gray-500">Loading businesses...</p>
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-500">No businesses found. Check back later!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((business) => (
              <div
                key={business.id}
                onClick={() => router.push(`/explore/${business.slug}`)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {business.name}
                    </h3>
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {business.category}
                    </span>
                  </div>
                  {business.logo && (
                    <Image
                      src={business.logo}
                      alt={business.name}
                      width={48}
                      height={48}
                      className="rounded"
                    />
                  )}
                </div>

                {business.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {business.description}
                  </p>
                )}

                <div className="space-y-2 text-sm text-gray-500">
                  {business.address && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {business.address}
                    </div>
                  )}
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {business.welcomePoints} welcome points
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <span className="text-blue-600 text-sm font-medium">
                    View details →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
