"use client";

import { useEffect, useState, useCallback } from "react";

type StaffPermission = {
  id: string;
  role: string;
  isActive: boolean;
};

export default function StaffPermissionsPage() {
  const [staffId, setStaffId] = useState("staff");
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/trpc/staffPermission.list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { staffId } }),
    });
    const data = await res.json();
    setPermissions(data.result?.data || []);
    setLoading(false);
  }, [staffId]);

  const assign = async (role: string) => {
    await fetch("/api/trpc/staffPermission.assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { staffId, role } }),
    });
    load();
  };

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Staff permissions</h1>
      <input
        className="border rounded p-2"
        value={staffId}
        onChange={(e) => setStaffId(e.target.value)}
        placeholder="Staff ID"
      />
      <div className="space-y-2">
        {["CASHIER", "MANAGER", "OWNER"].map((role) => (
          <div key={role} className="flex items-center gap-2">
            <span className="w-32">{role}</span>
            <button
              className={`px-3 py-1 rounded ${
                permissions.some((p) => p.role === role && p.isActive)
                  ? "bg-green-600 text-white"
                  : "bg-gray-200"
              }`}
              onClick={() => assign(role)}
            >
              {permissions.some((p) => p.role === role && p.isActive) ? "Active" : "Assign"}
            </button>
          </div>
        ))}
      </div>
      {loading && <p>Loading...</p>}
    </div>
  );
}
