"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function LoyaltyManagementPage() {
  const utils = api.useUtils();
  const tiers = api.loyalty.listTiers.useQuery();
  const rules = api.loyalty.listRules.useQuery();

  const upsertTier = api.loyalty.upsertTier.useMutation({
    onSuccess: () => utils.loyalty.listTiers.invalidate(),
  });
  const deleteTier = api.loyalty.deleteTier.useMutation({
    onSuccess: () => utils.loyalty.listTiers.invalidate(),
  });
  const upsertRule = api.loyalty.upsertRule.useMutation({
    onSuccess: () => utils.loyalty.listRules.invalidate(),
  });
  const deleteRule = api.loyalty.deleteRule.useMutation({
    onSuccess: () => utils.loyalty.listRules.invalidate(),
  });

  const [tierForm, setTierForm] = useState({ name: "", minPoints: 0, discount: 0, color: "#999999" });
  const [ruleForm, setRuleForm] = useState<{ name: string; triggerType: "VISIT" | "PURCHASE"; pointsAwarded: number }>({
    name: "",
    triggerType: "VISIT",
    pointsAwarded: 1,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">Loyalty rules & tiers</h1>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Tiers</h2>
        <ul className="mb-4 flex flex-col gap-2">
          {tiers.data?.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded border border-border bg-card p-3">
              <span>
                <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: t.color }} />
                {t.name} — {t.minPoints}+ pts — {t.discount}% off
              </span>
              <button className="text-sm text-red-600" onClick={() => deleteTier.mutate({ id: t.id })}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            upsertTier.mutate(tierForm);
            setTierForm({ name: "", minPoints: 0, discount: 0, color: "#999999" });
          }}
          className="flex flex-wrap gap-2"
        >
          <input className="rounded border border-border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted" placeholder="Name (BRONZE)" value={tierForm.name}
            onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })} required />
          <input className="w-28 rounded border border-border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted" type="number" placeholder="Min points" value={tierForm.minPoints}
            onChange={(e) => setTierForm({ ...tierForm, minPoints: Number(e.target.value) })} />
          <input className="w-24 rounded border border-border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted" type="number" placeholder="Discount %" value={tierForm.discount}
            onChange={(e) => setTierForm({ ...tierForm, discount: Number(e.target.value) })} />
          <input className="h-9 w-14 rounded border border-border" type="color" value={tierForm.color}
            onChange={(e) => setTierForm({ ...tierForm, color: e.target.value })} />
          <button className="rounded bg-foreground px-3 py-1 text-background" type="submit">Add tier</button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Rules</h2>
        <ul className="mb-4 flex flex-col gap-2">
          {rules.data?.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded border border-border bg-card p-3">
              <span>{r.name} — {r.triggerType} — +{r.pointsAwarded} pts</span>
              <button className="text-sm text-red-600" onClick={() => deleteRule.mutate({ id: r.id })}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            upsertRule.mutate(ruleForm);
            setRuleForm({ name: "", triggerType: "VISIT", pointsAwarded: 1 });
          }}
          className="flex flex-wrap gap-2"
        >
          <input className="rounded border border-border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted" placeholder="Rule name" value={ruleForm.name}
            onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} required />
          <select className="rounded border border-border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted" value={ruleForm.triggerType}
            onChange={(e) => setRuleForm({ ...ruleForm, triggerType: e.target.value as "VISIT" | "PURCHASE" })}>
            <option value="VISIT">Visit</option>
            <option value="PURCHASE">Purchase</option>
          </select>
          <input className="w-28 rounded border border-border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted" type="number" placeholder="Points" value={ruleForm.pointsAwarded}
            onChange={(e) => setRuleForm({ ...ruleForm, pointsAwarded: Number(e.target.value) })} />
          <button className="rounded bg-foreground px-3 py-1 text-background" type="submit">Add rule</button>
        </form>
      </section>
    </main>
  );
}
