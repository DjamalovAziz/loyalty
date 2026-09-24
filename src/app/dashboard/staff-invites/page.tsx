"use client";

import { useEffect, useState } from "react";

export default function StaffInvitesPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [role, setRole] = useState<"CASHIER" | "MANAGER" | "OWNER">("CASHIER");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBusiness = async () => {
    const res = await fetch("/api/trpc/owner.myBusiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: {} }),
    });
    const data = await res.json();
    const biz = data.result?.data;
    if (biz?.id) {
      setBusinessId(biz.id);
      loadInvites(biz.id);
    }
  };

  const loadInvites = async (bizId: string) => {
    const res = await fetch("/api/trpc/owner.listStaffInvites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { businessId: bizId } }),
    });
    const data = await res.json();
    setInvites(data.result?.data || []);
  };

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setLoading(true);
    const res = await fetch("/api/trpc/owner.createStaffInvite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { businessId, role, expiresInDays } }),
    });
    const data = await res.json();
    if (data.result?.success) {
      setNewCode(data.result.rawCode);
      loadInvites(businessId);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Staff invites</h1>
      {!businessId && <p>Загрузка...</p>}
      <form onSubmit={createInvite} className="space-y-3 max-w-md">
        <div>
          <label className="block text-sm font-medium">Role</label>
          <select
            className="w-full border rounded p-2"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option value="CASHIER">CASHIER</option>
            <option value="MANAGER">MANAGER</option>
            <option value="OWNER">OWNER</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Expires in (days)</label>
          <input
            type="number"
            className="w-full border rounded p-2"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
            min={1}
          />
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create invite"}
        </button>
      </form>
      {newCode && (
        <div className="border rounded p-4 bg-green-50">
          <p className="font-semibold">Invite code created:</p>
          <p className="text-2xl font-mono">{newCode}</p>
          <p className="text-sm text-gray-600">Share this code with the staff member.</p>
        </div>
      )}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Active invites</h2>
        {invites.map((invite) => (
          <div key={invite.id} className="border rounded p-3 flex justify-between">
            <div>
              <p className="font-mono">{invite.code.slice(0, 8)}...</p>
              <p className="text-sm text-gray-500">{invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
            </div>
            <span className={invite.usedAt ? "text-gray-500" : "text-green-600"}>{invite.usedAt ? "Used" : "Active"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
