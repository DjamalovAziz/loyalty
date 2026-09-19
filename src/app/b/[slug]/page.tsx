"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "~/trpc/react";
import { useLocale } from "~/lib/i18n/context";

export default function BusinessPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: session, status } = useSession();

  if (status === "loading") return null;
  if (!session) return <CustomerLogin />;
  return <BusinessDetail slug={slug} />;
}

function CustomerLogin() {
  const { t } = useLocale();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [botLink, setBotLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestOtp = api.customer.requestLoginOtp.useMutation({
    onSuccess: (res) => {
      if (!res.delivered) setBotLink(res.botLink ?? null);
      setStep("otp");
    },
    onError: (e) => setError(e.message),
  });

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await signIn("customer", { phone_number: phone, otp, redirect: false });
    if (res?.error) setError(t("client.signin.invalidOtp"));
  }

  return (
    <main className="min-h-screen bg-background mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-xl font-bold">{t("client.signin.title")}</h1>

      {step === "phone" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestOtp.mutate({ phone_number: phone });
          }}
          className="flex flex-col gap-4"
        >
          <input
            className="rounded border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
            placeholder={t("client.signin.phone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="rounded-lg bg-foreground px-4 py-2.5 text-background" type="submit">
            {t("client.signin.sendCode")}
          </button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="flex flex-col gap-4">
          {botLink && (
            <p className="text-sm text-muted">
              <a href={botLink} className="underline" target="_blank" rel="noreferrer">
                {t("client.signin.openBot")}
              </a>
            </p>
          )}
          <input
            className="rounded border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
            placeholder={t("client.signin.otp")}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="rounded-lg bg-foreground px-4 py-2.5 text-background" type="submit">
            {t("client.signin.verify")}
          </button>
        </form>
      )}
    </main>
  );
}

function BusinessDetail({ slug }: { slug: string }) {
  const { t } = useLocale();
  const utils = api.useUtils();
  const info = api.customer.membershipFor.useQuery({ slug });

  const join = api.customer.join.useMutation({
    onSuccess: () => utils.customer.membershipFor.invalidate({ slug }),
  });
  const leave = api.customer.leave.useMutation({
    onSuccess: () => utils.customer.membershipFor.invalidate({ slug }),
  });
  const history = api.customer.myTransactions.useQuery(
    { membershipId: info.data?.membership?.id ?? "" },
    { enabled: !!info.data?.membership && info.data.membership.status === "ACTIVE" },
  );

  if (!info.data) return <p className="p-10 text-center text-muted">{t("client.dashboard.loading")}</p>;

  const { business, membership } = info.data;
  const isMember = !!membership && membership.status === "ACTIVE";

  return (
    <main className="min-h-screen bg-background mx-auto max-w-md px-4 py-10">
      <div className="mb-6 rounded-lg border border-border bg-card p-6 text-center">
        <h1 className="text-xl font-bold">{business.name}</h1>
        {business.description && <p className="mt-1 text-sm text-muted">{business.description}</p>}
        {business.welcomePoints > 0 && !membership && (
          <p className="mt-2 text-sm">🎁 {business.welcomePoints} pts welcome bonus</p>
        )}
      </div>

      {!isMember ? (
        <button
          className="w-full rounded-lg bg-foreground px-4 py-2.5 text-background"
          onClick={() => join.mutate({ slug })}
          disabled={join.isPending}
        >
          {join.isPending ? "..." : t("client.join.button")}
        </button>
      ) : (
        <>
          <div className="mb-6 rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted">{t("client.dashboard.yourBalance")}</p>
            <p className="text-4xl font-bold">{membership.points} pts</p>
            {membership.tier && (
              <p className="mt-1 text-sm text-muted">
                {membership.tier.name} {t("client.dashboard.tierDiscount")} · {membership.tier.discount}%
              </p>
            )}
          </div>

          <div className="mb-6 flex flex-col items-center rounded-lg border border-border bg-card p-6">
            <p className="mb-3 text-sm text-muted">{t("client.dashboard.showToStaff")}</p>
            <QRCodeSVG value={membership.customerId} size={180} />
          </div>

          <div className="mb-6 rounded-lg border border-border bg-card p-4">
            <p className="mb-3 font-semibold">{t("client.dashboard.recentActivity")}</p>
            <ul className="flex flex-col gap-2">
              {history.data?.map((tx) => (
                <li key={tx.id} className="flex justify-between text-sm">
                  <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                  <span className={tx.type === "EARN" ? "text-green-600" : "text-blue-600"}>
                    {tx.type === "EARN" ? "+" : "-"}
                    {tx.amount} pts
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button className="text-sm text-red-600 underline" onClick={() => leave.mutate({ slug })}>
            {t("client.leave.button")}
          </button>
        </>
      )}
    </main>
  );
}
