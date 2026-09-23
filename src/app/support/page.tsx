"use client";

import { useState } from "react";

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/trpc/support.create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { subject, message, source: "CUSTOMER", customerId: "temp", businessId: "temp" },
      }),
    });
    const data = await res.json();
    if (data.result?.success) {
      alert("Обращение отправлено");
      setSubject("");
      setMessage("");
    } else {
      alert("Ошибка");
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Поддержка</h1>
      <form onSubmit={submit} className="space-y-4">
        <input
          className="w-full border rounded p-2"
          placeholder="Тема"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <textarea
          className="w-full border rounded p-2 h-40"
          placeholder="Опишите проблему"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit">
          Отправить
        </button>
      </form>
    </div>
  );
}
