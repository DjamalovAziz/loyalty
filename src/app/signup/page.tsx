"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useLocale } from "~/lib/i18n/context";

export default function SignupPage() {
  const { t } = useLocale();
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
      setError(t("signup.passwordMismatch"));
      return;
    }
    signup.mutate({ name, phone_number: phone, password });
  }

  if (deepLink) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-4 text-xl font-semibold">{t("signup.almostDone")}</h1>
        <p className="mb-6 text-muted">{t("signup.confirmInTelegram")}</p>
        <a
          href={deepLink}
          className="rounded-lg bg-blue-500 px-5 py-2.5 text-white hover:bg-blue-600"
        >
          {t("signup.openTelegram")}
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">{t("signup.title")}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          className="rounded border border-border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          placeholder={t("signup.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded border border-border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          placeholder={t("signup.phone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          className="rounded border border-border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          type="password"
          placeholder={t("signup.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <input
          className="rounded border border-border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          type="password"
          placeholder={t("signup.confirmPassword")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={signup.isPending}
          className="rounded-lg bg-foreground px-4 py-2.5 text-background hover:opacity-90 disabled:opacity-50"
        >
          {signup.isPending ? t("signup.submitting") : t("signup.submit")}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {t("signup.haveAccount")}{" "}
        <Link href="/signin" className="underline">
          {t("signup.signinLink")}
        </Link>
      </p>
    </main>
  );
}
