"use client";

import { useState } from "react";

export default function SignUpPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/trpc/signup.start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });

    const data = await res.json();
    if (data.result?.success) {
      setTelegramUrl(data.result.telegramUrl);
    } else {
      setError(data.result?.error || "Signup failed");
    }
    setLoading(false);
  };

  if (telegramUrl) {
    return (
      <div className="max-w-md mx-auto mt-20 space-y-4">
        <h1 className="text-2xl font-bold">Confirm in Telegram</h1>
        <p>Click the button below to open Telegram and complete your registration.</p>
        <a
          href={telegramUrl}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded"
          target="_blank"
          rel="noreferrer"
        >
          Open Telegram
        </a>
        <p className="text-sm text-gray-500">
          After confirming in Telegram, you will be redirected to your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-bold">Sign up</h1>
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
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded" type="submit" disabled={loading}>
          {loading ? "Processing..." : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-gray-500">
        Already have an account? <a href="/auth/signin" className="text-blue-600">Sign in</a>
      </p>
    </div>
  );
}
