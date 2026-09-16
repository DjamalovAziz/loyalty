"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLocale } from "~/lib/i18n/context";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
import { ThemeToggle } from "~/components/ThemeToggle";

export default function AdminSigninPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await signIn("admin", { username, password, redirect: false });
    if (res?.error) {
      setError(t("adminSignin.error"));
      return;
    }
    router.push("/admin");
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <div className="mb-4 flex justify-end">
        <div className="flex gap-2"><LanguageSwitcher /><ThemeToggle /></div>
      </div>
      <h1 className="mb-6 text-xl font-bold">{t("adminSignin.title")}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          className="rounded border border-border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          placeholder={t("adminSignin.username")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="rounded border border-border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          type="password"
          placeholder={t("adminSignin.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded-lg bg-foreground px-4 py-2.5 text-background" type="submit">
          {t("adminSignin.submit")}
        </button>
      </form>
    </main>
  );
}
