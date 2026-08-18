"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function QuestsPage() {
  const [quests, setQuests] = useState<any[]>([]);
  const [questsLoading, setQuestsLoading] = useState(true);

  useEffect(() => {
    async function loadQuests() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/quests", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuests(data.quests || []);
      }

      setQuestsLoading(false);
    }

    loadQuests();
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
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold"
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
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
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

        <h1 className="text-4xl font-bold">⚔️ Quests</h1>

        <p className="mt-3 text-neutral-400">
          Voltooi quests, verdien XP en unlock nieuwe uitdagingen.
        </p>

        {questsLoading ? (
          <p className="mt-8 text-sm text-neutral-400">
            Quests laden...
          </p>
        ) : quests.length === 0 ? (
          <p className="mt-8 text-sm text-neutral-400">
            Nog geen quests beschikbaar.
          </p>
        ) : (
          <div className="mt-8 space-y-4">
            {quests.map((quest) => {
              const progress = Math.min(
                100,
                (Number(quest.progress) /
                  Number(quest.requirement_value)) *
                  100
              );

              const isLocked = quest.status === "locked";
              const isCompleted = quest.status === "completed";

              return (
                <div
                  key={quest.id}
                  className={`rounded-2xl border p-5 ${
                    isLocked
                      ? "border-neutral-800 bg-neutral-950 opacity-50"
                      : isCompleted
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-purple-500/30 bg-purple-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">
                        {isLocked ? "🔒" : quest.icon}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-semibold">
                            {quest.name}
                          </h2>

                          {isLocked ? (
                            <span className="text-xs text-neutral-500">
                              🔒 Vergrendeld
                            </span>
                          ) : isCompleted ? (
                            <span className="text-xs text-green-400">
                              ✓ Voltooid
                            </span>
                          ) : (
                            <span className="text-xs text-purple-400">
                              ⚔️ In progress
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-neutral-400">
                          {quest.description}
                        </p>
                      </div>
                    </div>

                    <div className="whitespace-nowrap text-right">
                      <p className="font-semibold text-purple-400">
                        +{quest.reward_xp} XP
                      </p>
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="mt-5">
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>
                          {quest.requirement_type === "distance"
                            ? `${Number(quest.progress).toFixed(
                                1
                              )} / ${quest.requirement_value} km`
                            : quest.requirement_type ===
                              "elevation"
                            ? `${Math.round(
                                Number(quest.progress)
                              )} / ${
                                quest.requirement_value
                              } hm`
                            : quest.requirement_type ===
                              "moving_time"
                            ? `${Math.floor(
                                Number(quest.progress) / 3600
                              )} / ${Math.floor(
                                Number(
                                  quest.requirement_value
                                ) / 3600
                              )} uur`
                            : `${Math.round(
                                Number(quest.progress)
                              )} / ${
                                quest.requirement_value
                              }`}
                        </span>

                        <span>
                          {Math.round(progress)}%
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className={`h-full rounded-full ${
                            isCompleted
                              ? "bg-green-500"
                              : "bg-purple-500"
                          }`}
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}