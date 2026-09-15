"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminSigninPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await signIn("admin", { username, password, redirect: false });
    if (res?.error) {
      setError("Invalid credentials.");
      return;
    }
    router.push("/admin");
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-xl font-bold">Super Admin</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          className="rounded border px-3 py-2"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded-lg bg-gray-900 px-4 py-2.5 text-white" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
