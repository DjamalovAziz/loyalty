"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLocale } from "~/lib/i18n/context";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";

export default function OwnerSigninPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("owner", {
      phone_number: phone,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(t("ownerSignin.error"));
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher />
      </div>
      <h1 className="mb-6 text-2xl font-bold">{t("ownerSignin.title")}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          className="rounded border px-3 py-2"
          placeholder={t("ownerSignin.phone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          className="rounded border px-3 py-2"
          type="password"
          placeholder={t("ownerSignin.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {t("ownerSignin.submit")}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        {t("ownerSignin.noAccount")}{" "}
        <Link href="/signup" className="underline">
          {t("ownerSignin.signupLink")}
        </Link>
      </p>
    </main>
  );
}
