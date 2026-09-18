"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useLocale } from "~/lib/i18n/context";

type TierForm = { name: string; minPoints: number; discount: number; color: string };
type RuleForm = { name: string; triggerType: "VISIT" | "PURCHASE"; pointsAwarded: number };

const emptyTierForm: TierForm = { name: "", minPoints: 0, discount: 0, color: "#999999" };
const emptyRuleForm: RuleForm = { name: "", triggerType: "VISIT", pointsAwarded: 1 };

export default function LoyaltyManagementPage() {
  const { t } = useLocale();
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

  const [tierForm, setTierForm] = useState<TierForm>(emptyTierForm);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);

  const [ruleForm, setRuleForm] = useState<RuleForm>(emptyRuleForm);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  function startEditTier(tier: { id: string; name: string; minPoints: number; discount: number; color: string }) {
    setEditingTierId(tier.id);
    setTierForm({ name: tier.name, minPoints: tier.minPoints, discount: tier.discount, color: tier.color });
  }

  function cancelEditTier() {
    setEditingTierId(null);
    setTierForm(emptyTierForm);
  }

  function startEditRule(rule: { id: string; name: string; triggerType: "VISIT" | "PURCHASE"; pointsAwarded: number }) {
    setEditingRuleId(rule.id);
    setRuleForm({ name: rule.name, triggerType: rule.triggerType, pointsAwarded: rule.pointsAwarded });
  }

  function cancelEditRule() {
    setEditingRuleId(null);
    setRuleForm(emptyRuleForm);
  }

  return (
    <main className="min-h-screen bg-background mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("loyalty.title")}</h1>
        <Link href="/dashboard" className="text-sm underline">
          {t("loyalty.backToDashboard")}
        </Link>
      </div>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">{t("loyalty.tiers.title")}</h2>
        <ul className="mb-4 flex flex-col gap-2">
          {tiers.data?.map((tier) => (
            <li key={tier.id} className="flex items-center justify-between rounded border border-border bg-card p-3">
              <span>
                <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: tier.color }} />
                {tier.name} — {tier.minPoints}+ pts — {tier.discount}% off
              </span>
              <span className="flex gap-3">
                <button className="text-sm underline" onClick={() => startEditTier(tier)}>
                  {t("loyalty.edit")}
                </button>
                <button className="text-sm text-red-600" onClick={() => deleteTier.mutate({ id: tier.id })}>
                  {t("loyalty.delete")}
                </button>
              </span>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            upsertTier.mutate(editingTierId ? { ...tierForm, id: editingTierId } : tierForm);
            setEditingTierId(null);
            setTierForm(emptyTierForm);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input className="rounded border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted" placeholder={t("loyalty.tiers.namePlaceholder")} value={tierForm.name}
            onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })} required />
          <input className="w-28 rounded border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted" type="number" placeholder={t("loyalty.tiers.minPointsPlaceholder")} value={tierForm.minPoints}
            onChange={(e) => setTierForm({ ...tierForm, minPoints: Number(e.target.value) })} />
          <input className="w-24 rounded border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted" type="number" placeholder={t("loyalty.tiers.discountPlaceholder")} value={tierForm.discount}
            onChange={(e) => setTierForm({ ...tierForm, discount: Number(e.target.value) })} />
          <input className="h-9 w-14 rounded border border-border" type="color" value={tierForm.color}
            onChange={(e) => setTierForm({ ...tierForm, color: e.target.value })} />
          <button className="rounded bg-foreground px-3 py-1 text-background" type="submit">
            {editingTierId ? t("loyalty.tiers.save") : t("loyalty.tiers.add")}
          </button>
          {editingTierId && (
            <button type="button" className="text-sm underline" onClick={cancelEditTier}>
              {t("loyalty.tiers.cancel")}
            </button>
          )}
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">{t("loyalty.rules.title")}</h2>
        <ul className="mb-4 flex flex-col gap-2">
          {rules.data?.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between rounded border border-border bg-card p-3">
              <span>{rule.name} — {rule.triggerType} — +{rule.pointsAwarded} pts</span>
              <span className="flex gap-3">
                <button className="text-sm underline" onClick={() => startEditRule(rule)}>
                  {t("loyalty.edit")}
                </button>
                <button className="text-sm text-red-600" onClick={() => deleteRule.mutate({ id: rule.id })}>
                  {t("loyalty.delete")}
                </button>
              </span>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            upsertRule.mutate(editingRuleId ? { ...ruleForm, id: editingRuleId } : ruleForm);
            setEditingRuleId(null);
            setRuleForm(emptyRuleForm);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input className="rounded border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted" placeholder={t("loyalty.rules.namePlaceholder")} value={ruleForm.name}
            onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} required />
          <select className="rounded border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted" value={ruleForm.triggerType}
            onChange={(e) => setRuleForm({ ...ruleForm, triggerType: e.target.value as "VISIT" | "PURCHASE" })}>
            <option value="VISIT">{t("loyalty.rules.visit")}</option>
            <option value="PURCHASE">{t("loyalty.rules.purchase")}</option>
          </select>
          <input className="w-28 rounded border border-border bg-card px-2 py-1 text-foreground placeholder:text-muted" type="number" placeholder={t("loyalty.rules.pointsPlaceholder")} value={ruleForm.pointsAwarded}
            onChange={(e) => setRuleForm({ ...ruleForm, pointsAwarded: Number(e.target.value) })} />
          <button className="rounded bg-foreground px-3 py-1 text-background" type="submit">
            {editingRuleId ? t("loyalty.rules.save") : t("loyalty.rules.add")}
          </button>
          {editingRuleId && (
            <button type="button" className="text-sm underline" onClick={cancelEditRule}>
              {t("loyalty.rules.cancel")}
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
