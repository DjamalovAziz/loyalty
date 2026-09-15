import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Loyalty</h1>
      <p className="text-gray-600">
        Telegram-native multi-tenant loyalty platform. No email, no passwords to remember for
        clients — just a phone number and Telegram.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-white hover:bg-gray-700"
        >
          Register your business
        </Link>
      </div>
    </main>
  );
}
