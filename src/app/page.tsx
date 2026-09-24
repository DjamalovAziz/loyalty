import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">LoyaltySphere</h1>
      <p className="text-gray-600">
        Мультитенантная платформа лояльности для локального бизнеса.
      </p>
      <div className="flex gap-4">
        <Link href="/explore" className="px-4 py-2 bg-blue-600 text-white rounded">
          Найти бизнес
        </Link>
        <Link href="/profile" className="px-4 py-2 border rounded">
          Мой кабинет
        </Link>
      </div>
    </div>
  );
}
