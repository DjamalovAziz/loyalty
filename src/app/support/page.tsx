"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useLocale } from "~/lib/i18n/context";

export default function SupportPage() {
  const { t } = useLocale();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const create = api.support.create.useMutation({
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return (
      <main className="min-h-screen bg-background mx-auto max-w-md px-4 py-16 text-center">
        <p>{t("support.sent")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-xl font-bold">{t("support.title")}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ phone, name: name || undefined, subject, message });
        }}
        className="flex flex-col gap-4"
      >
        <input
          className="rounded border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          placeholder={t("support.phone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          className="rounded border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          placeholder={t("support.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          placeholder={t("support.subject")}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <textarea
          className="rounded border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
          placeholder={t("support.message")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
        />
        {create.isError && <p className="text-sm text-red-600">{create.error.message}</p>}
        <button
          className="rounded-lg bg-foreground px-4 py-2.5 text-background disabled:opacity-50"
          type="submit"
          disabled={create.isPending}
        >
          {create.isPending ? "..." : t("support.submit")}
        </button>
      </form>
    </main>
  );
}
