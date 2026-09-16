"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function StaffPanelPage() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [earnPoints, setEarnPoints] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const search = api.staff.searchClient.useQuery({ query }, { enabled: query.length >= 2 });
  const profile = api.staff.clientProfile.useQuery(
    { clientId: selectedId! },
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
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-xl font-bold">Staff panel</h1>

      <input
        className="mb-3 w-full rounded border border-border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted"
        placeholder="Search client by name or phone (or scan QR)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {search.data && search.data.length > 0 && !selectedId && (
        <ul className="mb-6 flex flex-col gap-1">
          {search.data.map((c) => (
            <li key={c.id}>
              <button
                className="w-full rounded border border-border border-border bg-card px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => setSelectedId(c.id)}
              >
                {c.name ?? c.phoneNumber} — {c.points} pts {c.tier ? `(${c.tier.name})` : ""}
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
          <h2 className="text-lg font-semibold">{profile.data.name ?? profile.data.phoneNumber}</h2>
          <p className="mb-4 text-muted">
            {profile.data.points} points {profile.data.tier ? `· ${profile.data.tier.name} tier` : ""}
          </p>

          <div className="mb-4 flex items-end gap-2">
            <input
              className="w-28 rounded border border-border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted"
              type="number"
              placeholder="Points"
              value={earnPoints}
              onChange={(e) => setEarnPoints(Number(e.target.value))}
            />
            <button
              className="rounded bg-green-600 px-3 py-1.5 text-white"
              onClick={() => earn.mutate({ clientId: profile.data.id, points: earnPoints })}
            >
              Earn points
            </button>
          </div>

          {!otpSent ? (
            <div className="flex items-end gap-2">
              <input
                className="w-28 rounded border border-border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted"
                type="number"
                placeholder="Points"
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(Number(e.target.value))}
              />
              <button
                className="rounded bg-blue-600 px-3 py-1.5 text-white"
                onClick={() =>
                  initiateRedeem.mutate({ clientId: profile.data.id, points: redeemPoints })
                }
              >
                Send redemption OTP
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <input
                className="w-28 rounded border border-border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
              />
              <button
                className="rounded bg-blue-600 px-3 py-1.5 text-white"
                onClick={() => confirmRedeem.mutate({ clientId: profile.data.id, otp })}
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
