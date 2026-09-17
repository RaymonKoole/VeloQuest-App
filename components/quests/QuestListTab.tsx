"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function formatProgress(quest: any) {
  const value = Number(quest.progress);
  const target = Number(quest.requirement_value);

  switch (quest.requirement_type) {
    case "distance":
      return `${value.toFixed(1)} / ${target} km`;
    case "elevation":
      return `${Math.round(value)} / ${target} hm`;
    case "moving_time":
      return `${Math.floor(value / 3600)} / ${Math.floor(target / 3600)} uur`;
    default:
      return `${Math.round(value)} / ${target}`;
  }
}

export default function QuestListTab() {
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

  if (questsLoading) {
    return <p className="mt-8 text-sm text-neutral-400">Quests laden...</p>;
  }

  if (quests.length === 0) {
    return <p className="mt-8 text-sm text-neutral-400">Nog geen quests beschikbaar.</p>;
  }

  const completedCount = quests.filter((quest) => quest.status === "completed").length;
  const totalQuestXp = quests
    .filter((quest) => quest.status === "completed")
    .reduce((sum, quest) => sum + Number(quest.reward_xp || 0), 0);

  return (
    <>
      {/* "Quest Points"-achtige samenvatting, zoals Runescape's quest journal */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-neutral-800 bg-neutral-900 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-500">Quests voltooid</p>
          <p className="text-2xl font-bold text-purple-400">
            {completedCount}/{quests.length}
          </p>
        </div>

        <div className="h-10 w-px bg-neutral-800" />

        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-500">Quest-XP verdiend</p>
          <p className="text-2xl font-bold text-amber-400">
            {totalQuestXp.toLocaleString("nl-NL")}
          </p>
        </div>
      </div>

      {/* De quest-lijst zelf: één doorlopende, dichte lijst met statuskleuren
          (grijs = vergrendeld, paars = bezig, groen = voltooid) — net als
          Runescape's quest journal, i.p.v. losse grote kaarten. */}
      <div className="mt-6 divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800">
        {quests.map((quest) => {
          const isLocked = quest.status === "locked";
          const isCompleted = quest.status === "completed";
          const progress = Math.min(
            100,
            (Number(quest.progress) / Number(quest.requirement_value)) * 100
          );

          const nameColor = isLocked
            ? "text-neutral-500"
            : isCompleted
            ? "text-green-400"
            : "text-purple-300";

          return (
            <div
              key={quest.id}
              className={`flex flex-col gap-2 bg-neutral-950 px-5 py-3 ${isLocked ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-center text-sm">
                  {isLocked ? "🔒" : isCompleted ? "✓" : "⚔️"}
                </span>

                <span className="text-lg shrink-0">{isLocked ? "🔒" : quest.icon}</span>

                <div className="min-w-0 flex-1">
                  <p className={`truncate font-semibold ${nameColor}`}>{quest.name}</p>
                  <p className="truncate text-xs text-neutral-500">{quest.description}</p>
                </div>

                <p className="shrink-0 whitespace-nowrap text-sm font-semibold text-amber-400">
                  +{quest.reward_xp} XP
                </p>
              </div>

              {!isLocked && (
                <div className="pl-8">
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>{formatProgress(quest)}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>

                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className={`h-full rounded-full ${isCompleted ? "bg-green-500" : "bg-purple-500"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
