"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "~/trpc/react";

export default function ClientAppPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: session, status } = useSession();

  if (status === "loading") return null;
  if (!session) return <ClientLogin slug={slug} />;
  return <ClientDashboard />;
}

function ClientLogin({ slug }: { slug: string }) {
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
    const res = await signIn("client", {
      phone_number: phone,
      otp,
      businessSlug: slug,
      redirect: false,
    });
    if (res?.error) setError("Invalid or expired code.");
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-xl font-bold">Sign in</h1>

      {step === "phone" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestOtp.mutate({ phone_number: phone, businessSlug: slug });
          }}
          className="flex flex-col gap-4"
        >
          <input
            className="rounded border px-3 py-2"
            placeholder="+998901234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="rounded-lg bg-gray-900 px-4 py-2.5 text-white" type="submit">
            Send code
          </button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="flex flex-col gap-4">
          {botLink && (
            <p className="text-sm text-gray-600">
              Open{" "}
              <a href={botLink} className="underline" target="_blank" rel="noreferrer">
                the Telegram bot
              </a>{" "}
              to link your account and receive your code.
            </p>
          )}
          <input
            className="rounded border px-3 py-2"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="rounded-lg bg-gray-900 px-4 py-2.5 text-white" type="submit">
            Verify
          </button>
        </form>
      )}
    </main>
  );
}

function ClientDashboard() {
  const me = api.customer.me.useQuery();
  const tiers = api.customer.myTiers.useQuery();
  const history = api.customer.myTransactions.useQuery();

  if (!me.data) return <p className="p-10 text-center text-gray-500">Loading...</p>;

  const nextTier = tiers.data?.find((t) => t.minPoints > me.data.points);
  const progress = nextTier
    ? Math.min(100, Math.round((me.data.points / nextTier.minPoints) * 100))
    : 100;

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 rounded-lg border bg-white p-6 text-center">
        <p className="text-sm text-gray-500">Your balance</p>
        <p className="text-4xl font-bold">{me.data.points} pts</p>
        {me.data.tier && (
          <p className="mt-1 text-sm text-gray-600">
            {me.data.tier.name} tier · {me.data.tier.discount}% discount
          </p>
        )}
        <div className="mt-4 h-2 w-full rounded-full bg-gray-200">
          <div className="h-2 rounded-full bg-gray-900" style={{ width: `${progress}%` }} />
        </div>
        {nextTier && (
          <p className="mt-1 text-xs text-gray-500">
            {nextTier.minPoints - me.data.points} points to {nextTier.name}
          </p>
        )}
      </div>

      <div className="mb-6 flex flex-col items-center rounded-lg border bg-white p-6">
        <p className="mb-3 text-sm text-gray-500">Show this to staff</p>
        <QRCodeSVG value={me.data.id} size={180} />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <p className="mb-3 font-semibold">Recent activity</p>
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
    </main>
  );
}
