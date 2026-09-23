"use client";

import { useState } from "react";

export default function StaffLoginPage() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/trpc/staff.loginWithPin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { email, pin, businessId } }),
    });

    const data = await res.json();
    if (data.result?.success) {
      window.location.href = "/staff";
    } else {
      setError(data.result?.error || "Login failed");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-bold">Staff вход</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          placeholder="Business ID"
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          required
        />
        <input
          className="w-full border rounded p-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border rounded p-2"
          placeholder="PIN"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded" type="submit">
          Войти
        </button>
      </form>
    </div>
  );
}
