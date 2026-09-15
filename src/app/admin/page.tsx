"use client";

import { api } from "~/trpc/react";

export default function AdminPage() {
  const overview = api.admin.overview.useQuery();
  const businesses = api.admin.listBusinesses.useQuery();
  const users = api.admin.listUsers.useQuery();
  const utils = api.useUtils();
  const setVerified = api.admin.setBusinessOwnerVerified.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">Super Admin</h1>

      {overview.data && (
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Businesses" value={overview.data.businessCount} />
          <Stat label="Owners" value={overview.data.ownerCount} />
          <Stat label="Staff" value={overview.data.staffCount} />
          <Stat label="Clients" value={overview.data.clientCount} />
          <Stat label="Transactions" value={overview.data.txCount} />
        </div>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Businesses</h2>
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Slug</th>
                <th className="p-2">Owner</th>
                <th className="p-2">Clients</th>
                <th className="p-2">Staff</th>
                <th className="p-2">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.data?.map((b) => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="p-2">{b.name}</td>
                  <td className="p-2 text-gray-500">{b.slug}</td>
                  <td className="p-2">{b.owner.name} ({b.owner.phoneNumber})</td>
                  <td className="p-2">{b._count.clients}</td>
                  <td className="p-2">{b._count.staff}</td>
                  <td className="p-2">{b._count.transactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Owners & staff</h2>
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Role</th>
                <th className="p-2">Business</th>
                <th className="p-2">Verified</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2 text-gray-500">{u.phoneNumber}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2">{u.business?.name ?? "—"}</td>
                  <td className="p-2">
                    <button
                      className={u.verified ? "text-green-700" : "text-red-600 underline"}
                      onClick={() => setVerified.mutate({ userId: u.id, verified: !u.verified })}
                    >
                      {u.verified ? "Verified" : "Unverified"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
