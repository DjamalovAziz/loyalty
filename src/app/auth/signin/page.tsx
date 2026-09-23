"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/trpc/customer.requestLoginOtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (res.ok) {
      setSent(true);
    } else {
      setError("Failed to send code");
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await signIn("phone", {
      phone,
      code,
      redirect: false,
    });
    if (res?.ok) {
      window.location.href = "/dashboard";
    } else {
      setError("Invalid code");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      {!sent ? (
        <form onSubmit={requestOtp} className="space-y-4">
          <input
            className="w-full border rounded p-2"
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded" type="submit">
            Send code
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <input
            className="w-full border rounded p-2"
            type="text"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded" type="submit">
            Verify
          </button>
        </form>
      )}
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
