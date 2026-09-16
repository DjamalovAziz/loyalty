"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useLocale } from "~/lib/i18n/context";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";

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
        <p className="mb-6 text-gray-600">{t("signup.confirmInTelegram")}</p>
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
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher />
      </div>
      <h1 className="mb-6 text-2xl font-bold">{t("signup.title")}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          className="rounded border px-3 py-2"
          placeholder={t("signup.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2"
          placeholder={t("signup.phone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2"
          type="password"
          placeholder={t("signup.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <input
          className="rounded border px-3 py-2"
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
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {signup.isPending ? t("signup.submitting") : t("signup.submit")}
        </button>
      </form>
    </main>
  );
}
