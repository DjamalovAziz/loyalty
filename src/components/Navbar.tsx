"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Главная" },
  { href: "/explore", label: "Каталог" },
  { href: "/profile", label: "Мой кабинет" },
  { href: "/support", label: "Поддержка" },
  { href: "/auth/signin", label: "Sign in" },
  { href: "/signup", label: "Sign up" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/staff", label: "Staff" },
  { href: "/admin", label: "Admin" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b p-4 flex gap-4 flex-wrap">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={pathname === link.href ? "font-bold text-blue-600" : ""}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
