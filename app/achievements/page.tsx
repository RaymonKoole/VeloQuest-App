"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
function getCategoryLabel(category: string) {
  switch (category) {
    case "Cycling":
      return "🚴 Cycling";
    case "Climbing":
      return "⛰️ Climbing";
    case "Exploration":
      return "🗺️ Exploration";
    case "Performance":
      return "⚡ Performance";
    case "Streak":
      return "🔥 Streak";
    case "Challenge":
      return "🎯 Challenge";
    case "Secret":
      return "❓ Secret";
    default:
      return `🏆 ${category}`;
  }
}
export default function AchievementsPage() {
  const [badges, setBadges] = useState<any[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);

  useEffect(() => {
    async function loadBadges() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/badges", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBadges(data.badges || []);
      }

      setBadgesLoading(false);
    }

    loadBadges();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <nav className="mb-8 flex flex-wrap gap-2">
          <a
            href="/dashboard"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            🏠 Home
          </a>

          <a
            href="/quests"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            ⚔️ Quests
          </a>

          <a
            href="/skills"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            🧬 Skills
          </a>

          <a
            href="/achievements"
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white"
          >
            🏆 Achievements
          </a>

          <a
            href="/activities"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            🚴 Activities
          </a>

          <a
            href="/routes"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            🗺️ Routes
          </a>

          <a
            href="/wrapped"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            ✨ Wrapped
          </a>
        </nav>

        <h1 className="text-4xl font-bold">
          🏆 Achievements
        </h1>

        <p className="mt-3 text-neutral-400">
          Verzamel achievements en laat zien wat je hebt bereikt.
        </p>

        {badgesLoading ? (
          <p className="mt-8 text-sm text-neutral-400">
            Achievements laden...
          </p>
        ) : badges.length === 0 ? (
          <p className="mt-8 text-sm text-neutral-400">
            Nog geen achievements beschikbaar.
          </p>
        ) : (
          <div className="mt-8 space-y-10">
  {Object.entries(
    badges.reduce((groups: Record<string, any[]>, badge) => {
      const category = badge.category || "Cycling";

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(badge);

      return groups;
    }, {})
  ).map(([category, categoryBadges]) => {
    const unlockedCount = categoryBadges.filter(
      (badge) => badge.unlocked
    ).length;

    return (
      <section key={category}>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {getCategoryLabel(category)}
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {unlockedCount} / {categoryBadges.length} vrijgespeeld
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryBadges.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-2xl border p-6 transition ${
                badge.unlocked
                  ? "border-purple-500/30 bg-neutral-900"
                  : "border-neutral-800 bg-neutral-950 opacity-50"
              }`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`text-4xl ${
                    badge.unlocked ? "" : "grayscale"
                  }`}
                >
                  {badge.icon}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {badge.name}
                    </h3>

                    {badge.unlocked && (
                      <span className="text-xs text-green-400">
                        ✓
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-neutral-400">
                    {badge.description}
                  </p>

                  {badge.unlocked && badge.unlocked_at && (
                    <p className="mt-3 text-xs text-neutral-600">
                      Vrijgespeeld op{" "}
                      {new Date(
                        badge.unlocked_at
                      ).toLocaleDateString("nl-NL")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  })}
</div>
        )}
      </div>
    </main>
  );
}