"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useLocale } from "~/lib/i18n/context";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";

export default function StaffSigninPage() {
  const { t } = useLocale();
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await signIn("staff", {
      phone_number: phone,
      pin,
      businessSlug: slug,
      redirect: false,
    });
    if (res?.error) {
      setError(t("staffSignin.error"));
      return;
    }
    router.push(`/staff/${slug}/panel`);
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher />
      </div>
      <h1 className="mb-6 text-xl font-bold">{t("staffSignin.title")}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input className="rounded border px-3 py-2" placeholder={t("staffSignin.phone")} value={phone}
          onChange={(e) => setPhone(e.target.value)} required />
        <input className="rounded border px-3 py-2" type="password" placeholder={t("staffSignin.pin")} value={pin}
          onChange={(e) => setPin(e.target.value)} maxLength={4} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded-lg bg-gray-900 px-4 py-2.5 text-white" type="submit">
          {t("staffSignin.submit")}
        </button>
      </form>
    </main>
  );
}
