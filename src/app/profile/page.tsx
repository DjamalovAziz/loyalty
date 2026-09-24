"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Account = {
  id: string;
  phone: string;
  role: string;
};

type Business = {
  id: string;
  name: string;
  slug: string;
};

type Membership = {
  id: string;
  business: { name: string; slug: string };
};

export default function ProfilePage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/trpc/customer.me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: {} }),
      }).then((r) => r.json()),
      fetch("/api/trpc/customer.myMemberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: {} }),
      }).then((r) => r.json()),
      fetch("/api/trpc/owner.myBusiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: {} }),
      }).then((r) => r.json()),
    ]).then(([accountData, membershipsData, businessData]) => {
      setAccount(accountData.result?.data || null);
      setMemberships(membershipsData.result?.data || []);
      setBusiness(businessData.result?.data || null);
    });
  }, []);

  if (!account) {
    return (
      <div className="max-w-md mx-auto mt-20 space-y-4">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-20 space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="border rounded p-4 space-y-2">
        <h2 className="text-lg font-semibold">Account</h2>
        <p>
          <strong>Phone:</strong> {account.phone}
        </p>
        <p>
          <strong>Role:</strong> {account.role}
        </p>
      </div>

      <div className="border rounded p-4 space-y-2">
        <h2 className="text-lg font-semibold">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/explore"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded"
          >
            Explore businesses
          </Link>
          {!business && (
            <Link
              href="/dashboard/create-business"
              className="inline-block px-4 py-2 border rounded"
            >
              Create a business
            </Link>
          )}
          <Link
            href="/staff/invite"
            className="inline-block px-4 py-2 border rounded"
          >
            Accept staff invite
          </Link>
        </div>
      </div>

      {business && (
        <div className="border rounded p-4 space-y-2">
          <h2 className="text-lg font-semibold">My business</h2>
          <p>
            <strong>Name:</strong> {business.name}
          </p>
          <p>
            <strong>Slug:</strong> {business.slug}
          </p>
          <Link href="/dashboard" className="text-blue-600">
            Go to dashboard →
          </Link>
        </div>
      )}

      <div className="border rounded p-4 space-y-2">
        <h2 className="text-lg font-semibold">My memberships</h2>
        {memberships.length === 0 ? (
          <p className="text-gray-500">You are not a member of any business yet.</p>
        ) : (
          <div className="space-y-2">
            {memberships.map((m) => (
              <div key={m.id} className="border rounded p-3">
                <p className="font-semibold">{m.business.name}</p>
                <p className="text-sm text-gray-500">{m.business.slug}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
