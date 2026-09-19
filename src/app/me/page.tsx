"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "~/trpc/react";
import { useLocale } from "~/lib/i18n/context";

export default function MePage() {
  const { t } = useLocale();
  const { data: session, status } = useSession();
  const me = api.customer.me.useQuery(undefined, { enabled: !!session });
  const memberships = api.customer.myMemberships.useQuery(undefined, { enabled: !!session });

  if (status === "loading") return null;
  if (!session || session.user.role !== "CUSTOMER") {
    return (
      <main className="min-h-screen bg-background mx-auto max-w-sm px-4 py-16 text-center">
        <p className="text-muted">{t("me.signInPrompt")}</p>
      </main>
    );
  }

  const active = memberships.data?.filter((m) => m.status === "ACTIVE") ?? [];

  return (
    <main className="min-h-screen bg-background mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">{t("me.title")}</h1>

      {me.data && (
        <div className="mb-6 flex flex-col items-center rounded-lg border border-border bg-card p-6">
          <p className="mb-3 text-sm text-muted">{t("me.yourQr")}</p>
          <QRCodeSVG value={me.data.id} size={180} />
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">{t("me.memberships")}</h2>
      {active.length === 0 && <p className="text-sm text-muted">{t("me.noMemberships")}</p>}
      <ul className="flex flex-col gap-2">
        {active.map((m) => (
          <li key={m.id}>
            <Link
              href={`/b/${m.business.slug}`}
              className="flex items-center justify-between rounded border border-border bg-card p-3 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <span>{m.business.name}</span>
              <span className="text-sm text-muted">
                {m.points} pts {m.tier ? `· ${m.tier.name}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
