"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useLocale } from "~/lib/i18n/context";

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
    <main className="min-h-screen bg-background mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-xl font-bold">{t("staffSignin.title")}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input className="rounded border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted" placeholder={t("staffSignin.phone")} value={phone}
          onChange={(e) => setPhone(e.target.value)} required />
        <input className="rounded border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted" type="password" placeholder={t("staffSignin.pin")} value={pin}
          onChange={(e) => setPin(e.target.value)} maxLength={4} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded-lg bg-foreground px-4 py-2.5 text-background" type="submit">
          {t("staffSignin.submit")}
        </button>
      </form>
    </main>
  );
}
