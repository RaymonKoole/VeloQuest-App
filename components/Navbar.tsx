"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Start", icon: "🏠" },
  { href: "/character", label: "Personage", icon: "🚴" },
  { href: "/quests", label: "Quests", icon: "⚔️" },
  { href: "/shop", label: "Winkel", icon: "🛍️" },
  { href: "/adventures", label: "Avonturen", icon: "🗺️" },
  { href: "/account", label: "Account", icon: "⚙️" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex flex-wrap items-center gap-2">
      <Link
        href="/dashboard"
        className="mr-4 flex items-center gap-2 text-lg font-bold text-white"
      >
        <img src="/logo.png" alt="VeloQuest" className="h-8 w-auto" />
        VeloQuest
      </Link>

      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            pathname === item.href
              ? "rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white"
              : "rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          }
        >
          {item.icon} {item.label}
        </Link>
      ))}
    </nav>
  );
}
