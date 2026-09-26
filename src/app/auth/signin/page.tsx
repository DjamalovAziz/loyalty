"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"password" | "otp">("password");

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
      window.location.href = "/profile";
    } else {
      setError("Invalid code");
    }
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await signIn("phone", {
      phone,
      password,
      redirect: false,
    });
    if (res?.ok) {
      window.location.href = "/profile";
    } else {
      setError("Invalid phone or password");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-bold">Sign in</h1>

      <div className="flex gap-2">
        <button
          type="button"
          className={`px-3 py-1 rounded border ${mode === "password" ? "bg-blue-600 text-white" : ""}`}
          onClick={() => setMode("password")}
        >
          Password
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded border ${mode === "otp" ? "bg-blue-600 text-white" : ""}`}
          onClick={() => setMode("otp")}
        >
          Code
        </button>
      </div>

      {mode === "password" ? (
        <form onSubmit={signInWithPassword} className="space-y-3">
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
          />
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded" type="submit">
            Sign in
          </button>
        </form>
      ) : (
        <>
          {!sent ? (
            <form onSubmit={requestOtp} className="space-y-3">
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
            <form onSubmit={verifyOtp} className="space-y-3">
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
        </>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
      <p className="text-sm">
        Don&apos;t have an account? <Link href="/signup" className="text-blue-600">Sign up</Link>
      </p>
    </div>
  );
}
