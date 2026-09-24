"use client";

import { useEffect, useState } from "react";

export default function OwnerSignUpPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    const res = await fetch("/api/trpc/owner.signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });

    const data = await res.json();
    if (data.result?.success) {
      setSuccess(true);
    } else {
      setError(data.result?.error || "Signup failed");
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-20 space-y-4">
        <h1 className="text-2xl font-bold">Account created</h1>
        <p>Your account has been created. You can now sign in.</p>
        <a href="/auth/signin" className="inline-block px-4 py-2 bg-blue-600 text-white rounded">
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-bold">Owner sign up</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          className="w-full border rounded p-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <input
          className="w-full border rounded p-2"
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded" type="submit">
          Sign up
        </button>
      </form>
    </div>
  );
}
