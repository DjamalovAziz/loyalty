"use client";

import { useState } from "react";

type Role = "customer" | "owner" | "staff";

export default function SignUpPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const [result, setResult] = useState<{ accountId?: string; businessId?: string; pinCode?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setError(null);
    setTelegramUrl(null);
    setResult(null);
  };

  const submitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
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

  const submitOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);

    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/trpc/owner.signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });

    const data = await res.json();
    if (data.result?.success) {
      setResult({
        accountId: data.result.accountId,
      });
    } else {
      setError(data.result?.error || "Signup failed");
    }
    setLoading(false);
  };

  const submitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);

    const res = await fetch("/api/trpc/staff.acceptInvite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: inviteCode }),
    });

    const data = await res.json();
    if (data.result?.success) {
      setResult({ businessId: data.result.businessId });
    } else {
      setError(data.result?.error || "Invalid invite code");
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
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-md mx-auto mt-20 space-y-4">
        <h1 className="text-2xl font-bold">Registration successful</h1>
        <p>Your account has been created.</p>
        {result.businessId && (
          <p>
            <strong>Business ID:</strong> {result.businessId}
          </p>
        )}
        {result.pinCode && (
          <p>
            <strong>Your PIN:</strong> {result.pinCode}
          </p>
        )}
        <p className="text-sm text-gray-600">
          {result.pinCode ? "Save this PIN. You will need it to log in as staff." : "You can now sign in."}
        </p>
        <a href={result.pinCode ? "/staff/login" : "/auth/signin"} className="inline-block px-4 py-2 bg-blue-600 text-white rounded">
          Go to login
        </a>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="max-w-md mx-auto mt-20 space-y-4">
        <h1 className="text-2xl font-bold">Sign up</h1>
        <p className="text-gray-600">Select your account type:</p>
        <div className="space-y-2">
          <button
            onClick={() => setRole("customer")}
            className="w-full px-4 py-3 border rounded hover:bg-gray-50 text-left"
          >
            <span className="font-semibold">Customer</span>
            <span className="block text-sm text-gray-500">Join loyalty programs via Telegram</span>
          </button>
          <button
            onClick={() => setRole("owner")}
            className="w-full px-4 py-3 border rounded hover:bg-gray-50 text-left"
          >
            <span className="font-semibold">Business owner</span>
            <span className="block text-sm text-gray-500">Create a business and manage staff</span>
          </button>
          <button
            onClick={() => setRole("staff")}
            className="w-full px-4 py-3 border rounded hover:bg-gray-50 text-left"
          >
            <span className="font-semibold">Staff</span>
            <span className="block text-sm text-gray-500">Accept an invite code from your owner</span>
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Already have an account? <a href="/auth/signin" className="text-blue-600">Sign in</a>
        </p>
      </div>
    );
  }

  if (role === "customer") {
    return (
      <div className="max-w-md mx-auto mt-20 space-y-4">
        <h1 className="text-2xl font-bold">Customer sign up</h1>
        <form onSubmit={submitCustomer} className="space-y-3">
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
            {loading ? "Processing..." : "Continue to Telegram"}
          </button>
          <button
            type="button"
            onClick={() => { setRole(null); reset(); }}
            className="w-full px-4 py-2 border rounded"
          >
            Back
          </button>
        </form>
      </div>
    );
  }

  if (role === "owner") {
    return (
      <div className="max-w-md mx-auto mt-20 space-y-4">
        <h1 className="text-2xl font-bold">Owner sign up</h1>
        <form onSubmit={submitOwner} className="space-y-3">
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
            {loading ? "Creating..." : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => { setRole(null); reset(); }}
            className="w-full px-4 py-2 border rounded"
          >
            Back
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-bold">Accept staff invite</h1>
      <form onSubmit={submitStaff} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          placeholder="Invite code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded" type="submit" disabled={loading}>
          {loading ? "Processing..." : "Accept invite"}
        </button>
        <button
          type="button"
          onClick={() => { setRole(null); reset(); }}
          className="w-full px-4 py-2 border rounded"
        >
          Back
        </button>
      </form>
    </div>
  );
}
