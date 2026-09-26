"use client";

import { useEffect, useState } from "react";

export default function StaffInvitePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/trpc/staff.acceptInvite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();
    if (data.result?.data?.success) {
      setSuccess(true);
    } else {
      setError(data.result?.data?.error || "Invalid invite code");
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-20 space-y-4">
        <h1 className="text-2xl font-bold">Invite accepted</h1>
        <p>You have been added to the business. You can now log in with your PIN.</p>
        <a href="/staff/login" className="inline-block px-4 py-2 bg-blue-600 text-white rounded">
          Go to staff login
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-bold">Accept staff invite</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          placeholder="Invite code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded" type="submit">
          Accept invite
        </button>
      </form>
    </div>
  );
}
