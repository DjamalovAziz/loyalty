"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { useLocale } from "~/lib/i18n/context";

export default function DashboardPage() {
  const { t } = useLocale();
  const { data, isLoading } = api.loyalty.overview.useQuery();

  return (
    <main className="min-h-screen bg-background mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <Link href="/dashboard/loyalty" className="text-sm underline">
          {t("dashboard.manageTiers")}
        </Link>
      </div>

      {isLoading || !data ? (
        <p className="text-muted">{t("dashboard.loading")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label={t("dashboard.clients")} value={data.clientCount} />
          <Stat label={t("dashboard.staff")} value={data.staffCount} />
          <Stat label={t("dashboard.transactions")} value={data.txCount} />
          <Stat label={t("dashboard.pointsIssued")} value={data.pointsIssued} />
          <Stat label={t("dashboard.pointsRedeemed")} value={data.pointsRedeemed} />
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
