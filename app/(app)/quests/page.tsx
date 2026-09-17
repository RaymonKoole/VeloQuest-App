"use client";

import { useState } from "react";
import QuestListTab from "@/components/quests/QuestListTab";
import AchievementDiaryTab from "@/components/quests/AchievementDiaryTab";

const TABS = [
  { id: "quests", label: "⚔️ Quests" },
  { id: "achievements", label: "🏆 Achievements" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function QuestsPage() {
  const [tab, setTab] = useState<TabId>("quests");

  return (
    <>
      <h1 className="text-3xl font-bold">⚔️ Quests</h1>
      <p className="mt-1 text-neutral-400">
        Voltooi quests, verdien XP en verzamel achievements.
      </p>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-neutral-800 pb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "quests" && <QuestListTab />}
        {tab === "achievements" && <AchievementDiaryTab />}
      </div>
    </>
  );
}
