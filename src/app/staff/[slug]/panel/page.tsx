"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function StaffPanelPage() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [earnPoints, setEarnPoints] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const isScannedId = UUID_RE.test(query.trim());

  const search = api.staff.searchClient.useQuery(
    { query },
    { enabled: query.length >= 2 && !isScannedId },
  );
  const checkIn = api.staff.checkInByCustomerId.useMutation({
    onSuccess: (membership) => setSelectedId(membership.id),
  });
  const profile = api.staff.clientProfile.useQuery(
    { membershipId: selectedId! },
    { enabled: !!selectedId },
  );

  const earn = api.staff.earnPoints.useMutation({
    onSuccess: () => profile.refetch(),
  });
  const initiateRedeem = api.staff.initiateRedeem.useMutation({
    onSuccess: () => setOtpSent(true),
  });
  const confirmRedeem = api.staff.confirmRedeem.useMutation({
    onSuccess: () => {
      setOtpSent(false);
      setOtp("");
      profile.refetch();
    },
  });

  return (
    <main className="min-h-screen bg-background mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-xl font-bold">Staff panel</h1>

      <input
        className="mb-3 w-full rounded border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
        placeholder="Search by name or phone, or scan/paste a customer QR"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId(null);
        }}
      />

      {isScannedId && !selectedId && (
        <button
          className="mb-6 w-full rounded border border-border bg-card px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => checkIn.mutate({ customerId: query.trim() })}
          disabled={checkIn.isPending}
        >
          {checkIn.isPending ? "Checking in..." : "✓ Check in this customer"}
        </button>
      )}
      {checkIn.isError && <p className="mb-4 text-sm text-red-600">{checkIn.error.message}</p>}

      {search.data && search.data.length > 0 && !selectedId && (
        <ul className="mb-6 flex flex-col gap-1">
          {search.data.map((m) => (
            <li key={m.id}>
              <button
                className="w-full rounded border border-border bg-card px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => setSelectedId(m.id)}
              >
                {m.customer.name ?? m.customer.phoneNumber} — {m.points} pts {m.tier ? `(${m.tier.name})` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}

      {profile.data && (
        <div className="rounded-lg border border-border bg-card p-4">
          <button className="mb-4 text-sm text-muted underline" onClick={() => setSelectedId(null)}>
            ← back to search
          </button>
          <h2 className="text-lg font-semibold">
            {profile.data.customer.name ?? profile.data.customer.phoneNumber}
          </h2>
          <p className="mb-4 text-muted">
            {profile.data.points} points {profile.data.tier ? `· ${profile.data.tier.name} tier` : ""}
          </p>

          <div className="mb-4 flex items-end gap-2">
            <input
              className="w-28 rounded border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted"
              type="number"
              placeholder="Points"
              value={earnPoints}
              onChange={(e) => setEarnPoints(Number(e.target.value))}
            />
            <button
              className="rounded bg-green-600 px-3 py-1.5 text-white"
              onClick={() => earn.mutate({ membershipId: profile.data.id, points: earnPoints })}
            >
              Earn points
            </button>
          </div>

          {!otpSent ? (
            <div className="flex items-end gap-2">
              <input
                className="w-28 rounded border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted"
                type="number"
                placeholder="Points"
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(Number(e.target.value))}
              />
              <button
                className="rounded bg-blue-600 px-3 py-1.5 text-white"
                onClick={() =>
                  initiateRedeem.mutate({ membershipId: profile.data.id, points: redeemPoints })
                }
              >
                Send redemption OTP
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <input
                className="w-28 rounded border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
              />
              <button
                className="rounded bg-blue-600 px-3 py-1.5 text-white"
                onClick={() => confirmRedeem.mutate({ membershipId: profile.data.id, otp })}
              >
                Confirm redemption
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
