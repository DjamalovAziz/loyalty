"use client";

import { api } from "~/trpc/react";
import { useLocale } from "~/lib/i18n/context";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
import { ThemeToggle } from "~/components/ThemeToggle";

export default function AdminPage() {
  const { t } = useLocale();
  const overview = api.admin.overview.useQuery();
  const businesses = api.admin.listBusinesses.useQuery();
  const users = api.admin.listUsers.useQuery();
  const utils = api.useUtils();
  const setVerified = api.admin.setBusinessOwnerVerified.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  });

  const webhookInfo = api.admin.getTelegramWebhookInfo.useQuery();
  const setWebhook = api.admin.setTelegramWebhook.useMutation({
    onSuccess: () => webhookInfo.refetch(),
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.title")}</h1>
        <div className="flex gap-2"><LanguageSwitcher /><ThemeToggle /></div>
      </div>

      <section className="mb-10 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">{t("admin.webhook.title")}</h2>
        {webhookInfo.data && (
          <div className="mb-3 text-sm text-muted">
            <p>
              {t("admin.webhook.url")}: {webhookInfo.data.url || <span className="text-red-600">{t("admin.webhook.notSet")}</span>}
            </p>
            <p>{t("admin.webhook.pending")}: {webhookInfo.data.pending_update_count}</p>
            {webhookInfo.data.last_error_message && (
              <p className="text-red-600">
                {t("admin.webhook.lastError")}: {webhookInfo.data.last_error_message}
              </p>
            )}
          </div>
        )}
        <button
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          onClick={() => setWebhook.mutate()}
          disabled={setWebhook.isPending}
        >
          {setWebhook.isPending ? t("admin.webhook.registering") : t("admin.webhook.register")}
        </button>
        {setWebhook.isError && (
          <p className="mt-2 text-sm text-red-600">{setWebhook.error.message}</p>
        )}
        {setWebhook.isSuccess && (
          <p className="mt-2 text-sm text-green-700">{t("admin.webhook.success")}</p>
        )}
      </section>

      {overview.data && (
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label={t("admin.stat.businesses")} value={overview.data.businessCount} />
          <Stat label={t("admin.stat.owners")} value={overview.data.ownerCount} />
          <Stat label={t("admin.stat.staff")} value={overview.data.staffCount} />
          <Stat label={t("admin.stat.clients")} value={overview.data.clientCount} />
          <Stat label={t("admin.stat.transactions")} value={overview.data.txCount} />
        </div>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">{t("admin.businesses.title")}</h2>
        <div className="overflow-x-auto rounded border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-black/5 dark:bg-white/5">
              <tr>
                <th className="p-2">{t("admin.businesses.name")}</th>
                <th className="p-2">{t("admin.businesses.slug")}</th>
                <th className="p-2">{t("admin.businesses.owner")}</th>
                <th className="p-2">{t("admin.businesses.clients")}</th>
                <th className="p-2">{t("admin.businesses.staff")}</th>
                <th className="p-2">{t("admin.businesses.transactions")}</th>
              </tr>
            </thead>
            <tbody>
              {businesses.data?.map((b) => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="p-2">{b.name}</td>
                  <td className="p-2 text-muted">{b.slug}</td>
                  <td className="p-2">{b.owner.name} ({b.owner.phoneNumber})</td>
                  <td className="p-2">{b._count.clients}</td>
                  <td className="p-2">{b._count.staff}</td>
                  <td className="p-2">{b._count.transactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("admin.users.title")}</h2>
        <div className="overflow-x-auto rounded border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-black/5 dark:bg-white/5">
              <tr>
                <th className="p-2">{t("admin.users.name")}</th>
                <th className="p-2">{t("admin.users.phone")}</th>
                <th className="p-2">{t("admin.users.role")}</th>
                <th className="p-2">{t("admin.users.business")}</th>
                <th className="p-2">{t("admin.users.verified")}</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2 text-muted">{u.phoneNumber}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2">{u.business?.name ?? "—"}</td>
                  <td className="p-2">
                    <button
                      className={u.verified ? "text-green-700" : "text-red-600 underline"}
                      onClick={() => setVerified.mutate({ userId: u.id, verified: !u.verified })}
                    >
                      {u.verified ? t("admin.users.verified") : t("admin.users.unverified")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
