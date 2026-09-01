"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import type { RouteActivity } from "@/components/RoutesMap";

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

export default function RoutesPage() {
  const [activities, setActivities] = useState<RouteActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

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

  const countries = useMemo(() => {
    const set = new Set(
      activities.map((activity) => activity.country).filter(Boolean) as string[]
    );

    return Array.from(set).sort();
  }, [activities]);

  const cities = useMemo(() => {
    const set = new Set(
      activities
        .filter((activity) => !country || activity.country === country)
        .map((activity) => activity.city)
        .filter(Boolean) as string[]
    );

    return Array.from(set).sort();
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
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Navbar active="/routes" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">🗺️ Routes</h1>

            <p className="mt-1 text-neutral-400">
              Bekijk waar je al hebt gefietst.
            </p>
          </div>

          <div className="flex gap-3">
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCity("");
              }}
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
            >
              <option value="">Alle landen</option>
              {countries.map((countryOption) => (
                <option key={countryOption} value={countryOption}>
                  {countryOption}
                </option>
              ))}
            </select>

            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
            >
              <option value="">Alle plaatsen</option>
              {cities.map((cityOption) => (
                <option key={cityOption} value={cityOption}>
                  {cityOption}
                </option>
              ))}
            </select>
          </div>
        </div>

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
          ) : (
            <RoutesMap activities={filteredActivities} />
          )}
        </div>

        <p className="mt-3 text-sm text-neutral-500">
          {filteredActivities.length} van {activities.length} ritten met locatiegegevens.
        </p>
      </div>
    </main>
  );
}
