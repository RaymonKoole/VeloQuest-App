"use client";

import { useState } from "react";
import RoutesTab from "@/components/adventures/RoutesTab";
import ActivitiesTab from "@/components/adventures/ActivitiesTab";
import SegmentsTab from "@/components/adventures/SegmentsTab";

const TABS = [
  { id: "routes", label: "🗺️ Kaart" },
  { id: "activities", label: "📋 Ritten" },
  { id: "segments", label: "🚵 Segmenten" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdventuresPage() {
  const [tab, setTab] = useState<TabId>("routes");

  return (
    <>
      <h1 className="text-3xl font-bold">🗺️ Adventures</h1>
      <p className="mt-1 text-neutral-400">
        Al je ritten, routekaart en Strava-segmenten op één plek.
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
        {tab === "routes" && <RoutesTab />}
        {tab === "activities" && <ActivitiesTab />}
        {tab === "segments" && <SegmentsTab />}
      </div>
    </>
  );
}
