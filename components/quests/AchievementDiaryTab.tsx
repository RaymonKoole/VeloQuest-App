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

export default function AchievementDiaryTab() {
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

  if (badgesLoading) {
    return <p className="mt-8 text-sm text-neutral-400">Achievements laden...</p>;
  }

  if (badges.length === 0) {
    return <p className="mt-8 text-sm text-neutral-400">Nog geen achievements beschikbaar.</p>;
  }

  const categories = Object.entries(
    badges.reduce((groups: Record<string, any[]>, badge) => {
      const category = badge.category || "Cycling";

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(badge);

      return groups;
    }, {})
  );

  return (
    <div className="space-y-8">
      {/* Elke categorie als een "diary"-regio met een eigen voortgangsbalk,
          zoals Runescape's Achievement Diaries per regio. */}
      {categories.map(([category, categoryBadges]) => {
        const unlockedCount = categoryBadges.filter((badge) => badge.unlocked).length;
        const progress = (unlockedCount / categoryBadges.length) * 100;
        const isComplete = unlockedCount === categoryBadges.length;

        return (
          <section
            key={category}
            className={`rounded-2xl border p-5 ${
              isComplete ? "border-amber-500/40 bg-amber-500/5" : "border-neutral-800 bg-neutral-900"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold">{getCategoryLabel(category)}</h2>

              <p className={`text-sm font-semibold ${isComplete ? "text-amber-400" : "text-neutral-400"}`}>
                {isComplete ? "🏅 " : ""}
                {unlockedCount}/{categoryBadges.length}
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                className={`h-full rounded-full ${isComplete ? "bg-amber-500" : "bg-purple-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categoryBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                    badge.unlocked
                      ? "border-purple-500/30 bg-neutral-950"
                      : "border-neutral-800 bg-neutral-950/50 opacity-50"
                  }`}
                >
                  <span className={`text-2xl ${badge.unlocked ? "" : "grayscale"}`}>{badge.icon}</span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{badge.name}</p>
                      {badge.unlocked && <span className="text-xs text-green-400">✓</span>}
                    </div>

                    <p className="mt-1 text-xs text-neutral-500">{badge.description}</p>

                    {badge.unlocked && badge.unlocked_at && (
                      <p className="mt-1 text-xs text-neutral-600">
                        {new Date(badge.unlocked_at).toLocaleDateString("nl-NL")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
