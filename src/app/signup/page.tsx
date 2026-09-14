"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);

  const signup = api.auth.signup.useMutation({
    onSuccess: (data) => {
      setDeepLink(data.deepLink);
      window.location.href = data.deepLink;
    },
    onError: (err) => setError(err.message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    signup.mutate({ name, phone_number: phone, password });
  }

  if (deepLink) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-4 text-xl font-semibold">Almost done!</h1>
        <p className="mb-6 text-gray-600">
          Confirm your phone number in Telegram to finish registration.
        </p>
        <a
          href={deepLink}
          className="rounded-lg bg-blue-500 px-5 py-2.5 text-white hover:bg-blue-600"
        >
          Open Telegram
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">Register your business</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          className="rounded border px-3 py-2"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2"
          placeholder="+998901234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <input
          className="rounded border px-3 py-2"
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={signup.isPending}
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {signup.isPending ? "Submitting..." : "Continue with Telegram"}
        </button>
      </form>
    </main>
  );
}
