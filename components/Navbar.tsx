"use client";

import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/quests", label: "Quests", icon: "⚔️" },
  { href: "/skills", label: "Skills", icon: "🧬" },
  { href: "/achievements", label: "Achievements", icon: "🏆" },
  { href: "/activities", label: "Activities", icon: "🚴" },
  { href: "/routes", label: "Routes", icon: "🗺️" },
  { href: "/wrapped", label: "Wrapped", icon: "✨" },
];

export default function Navbar({ active }: { active: string }) {
  return (
    <nav className="mb-8 flex flex-wrap items-center gap-2">
      <Link
        href="/dashboard"
        className="mr-4 text-lg font-bold text-white"
      >
        VeloQuest
      </Link>

      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            active === item.href
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
