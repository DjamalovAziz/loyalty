"use client";

import { useEffect, useState } from "react";

type Business = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  logoUrl: string | null;
  welcomePoints: number;
  minimumCashback: number;
};

export default function DashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/trpc/business.explore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 1, offset: 0 }),
    })
      .then((r) => r.json())
      .then((data) => {
        const items = data.result?.data?.items || [];
        setBusiness(items[0] || null);
      });
  }, []);

  const update = async (patch: Partial<Business>) => {
    if (!business) return;
    setSaving(true);
    await fetch("/api/trpc/owner.businessProfileUpdate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: business.id, ...patch }),
    });
    setBusiness({ ...business, ...patch });
    setSaving(false);
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !business) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("businessId", business.id);
    const res = await fetch("/api/business/upload-logo", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      setBusiness({ ...business, logoUrl: data.logoUrl });
    }
    setUploading(false);
  };

  if (!business) return <p>Загрузка...</p>;

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Dashboard владельца</h1>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Название</label>
          <input
            className="w-full border rounded p-2"
            value={business.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Описание</label>
          <textarea
            className="w-full border rounded p-2 h-24"
            value={business.description || ""}
            onChange={(e) => update({ description: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Категория</label>
          <input
            className="w-full border rounded p-2"
            value={business.category || ""}
            onChange={(e) => update({ category: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Адрес</label>
          <input
            className="w-full border rounded p-2"
            value={business.address || ""}
            onChange={(e) => update({ address: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Логотип</label>
          {business.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoUrl} alt="Logo" className="h-16 w-16 object-cover rounded mb-2" />
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={uploadLogo}
            disabled={uploading}
          />
          {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Приветственные баллы</label>
          <input
            type="number"
            className="w-full border rounded p-2"
            value={business.welcomePoints}
            onChange={(e) => update({ welcomePoints: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Минимальный кешбэк</label>
          <input
            type="number"
            className="w-full border rounded p-2"
            value={business.minimumCashback}
            onChange={(e) => update({ minimumCashback: Number(e.target.value) })}
          />
        </div>
        <p className="text-sm text-gray-500">{saving ? "Сохранение..." : "Сохранено"}</p>
      </div>
    </div>
  );
}
