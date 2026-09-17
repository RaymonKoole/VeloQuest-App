"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import type { RouteActivity } from "@/components/RoutesMap";
import type { RouteSegment } from "@/lib/routes/dedupeRouteSegments";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const RoutesMap = dynamic(() => import("@/components/RoutesMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-neutral-500">
      Kaart laden...
    </div>
  ),
});

export default function RoutesTab() {
  const [activities, setActivities] = useState<RouteActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [showAllActivities, setShowAllActivities] = useState(true);
  const [dedupedSegments, setDedupedSegments] = useState<RouteSegment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [segmentsError, setSegmentsError] = useState("");

  useEffect(() => {
    async function loadRoutes() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/routes", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }

      setLoading(false);
    }

    loadRoutes();
  }, []);

  useEffect(() => {
    if (showAllActivities) {
      return;
    }

    async function loadSegments() {
      setSegmentsLoading(true);
      setSegmentsError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const params = new URLSearchParams();

      if (country) {
        params.set("country", country);
      }

      if (city) {
        params.set("city", city);
      }

      const response = await fetch(`/api/routes/segments?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setSegmentsError(data.error || "Unieke routes konden niet worden berekend.");
        setSegmentsLoading(false);
        return;
      }

      setDedupedSegments(data.segments || []);
      setSegmentsLoading(false);
    }

    loadSegments();
  }, [showAllActivities, country, city]);

  const countries = useMemo(() => {
    const counts = new Map<string, number>();

    for (const activity of activities) {
      if (activity.country) {
        counts.set(activity.country, (counts.get(activity.country) || 0) + 1);
      }
    }

    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [activities]);

  const cities = useMemo(() => {
    const counts = new Map<string, number>();

    for (const activity of activities) {
      if (!activity.city) {
        continue;
      }

      if (country && activity.country !== country) {
        continue;
      }

      counts.set(activity.city, (counts.get(activity.city) || 0) + 1);
    }

    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [activities, country]);

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (country && activity.country !== country) {
        return false;
      }

      if (city && activity.city !== city) {
        return false;
      }

      return true;
    });
  }, [activities, country, city]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-neutral-400">Bekijk waar je al hebt gefietst.</p>

        <div className="flex gap-3">
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setCity("");
            }}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
          >
            <option value="">Alle landen ({activities.length})</option>
            {countries.map(([countryOption, count]) => (
              <option key={countryOption} value={countryOption}>
                {countryOption} ({count})
              </option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
          >
            <option value="">Alle plaatsen</option>
            {cities.map(([cityOption, count]) => (
              <option key={cityOption} value={cityOption}>
                {cityOption} ({count})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          id="showAllActivities"
          type="checkbox"
          checked={showAllActivities}
          onChange={(e) => setShowAllActivities(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
        />
        <label htmlFor="showAllActivities" className="text-sm text-neutral-300">
          Toon alle activiteiten{" "}
          <span className="text-neutral-500">
            (uitvinken toont per route maar 1 lijn, ook als je 'm vaker hebt gereden)
          </span>
        </label>
      </div>

      <p className="mt-2 text-xs text-neutral-500">
        Land en plaats worden automatisch bepaald op basis van de startlocatie van elke rit (via OpenStreetMap).
      </p>

      <div className="mt-6 h-[520px] overflow-hidden rounded-2xl border border-neutral-800">
        {loading ? (
          <div className="flex h-full items-center justify-center text-neutral-400">
            Routes laden...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-neutral-400">
            {activities.length === 0
              ? "Nog geen ritten met locatiegegevens gevonden. Synchroniseer je Strava-activiteiten opnieuw vanaf het dashboard."
              : "Geen ritten gevonden voor dit filter."}
          </div>
        ) : !showAllActivities && segmentsLoading ? (
          <div className="flex h-full items-center justify-center text-neutral-400">
            Unieke routes berekenen...
          </div>
        ) : (
          <RoutesMap
            activities={filteredActivities}
            showAllActivities={showAllActivities}
            dedupedSegments={dedupedSegments}
          />
        )}
      </div>

      {segmentsError && (
        <p className="mt-2 text-sm text-red-400">{segmentsError}</p>
      )}

      <p className="mt-3 text-sm text-neutral-500">
        {filteredActivities.length} van {activities.length} ritten met locatiegegevens.
      </p>
    </>
  );
}
