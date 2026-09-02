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

  const [startAddress, setStartAddress] = useState("");
  const [isLoop, setIsLoop] = useState(true);
  const [endAddress, setEndAddress] = useState("");
  const [distanceKm, setDistanceKm] = useState("30");
  const [desiredNewKm, setDesiredNewKm] = useState("");
  const [direction, setDirection] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatedRoute, setGeneratedRoute] = useState<[number, number][] | null>(null);
  const [generatedStats, setGeneratedStats] = useState<{
    distanceKm: number;
    newKm: number;
    riddenKm: number;
    startDisplayName: string;
    endDisplayName: string | null;
  } | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();

    setGenerating(true);
    setGenerateError("");
    setGeneratedRoute(null);
    setGeneratedStats(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch("/api/routes/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        startAddress,
        endAddress: isLoop ? undefined : endAddress,
        distanceKm: Number(distanceKm),
        desiredNewKm: desiredNewKm || undefined,
        direction: direction || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setGenerateError(data.error || "Route genereren is mislukt.");
      setGenerating(false);
      return;
    }

    setGeneratedRoute(data.points);
    setGeneratedStats({
      distanceKm: data.distanceKm,
      newKm: data.newKm,
      riddenKm: data.riddenKm,
      startDisplayName: data.startDisplayName,
      endDisplayName: data.endDisplayName ?? null,
    });
    setGenerating(false);
  }

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

        <p className="mt-2 text-xs text-neutral-500">
          Land en plaats worden automatisch bepaald op basis van de startlocatie van elke rit (via OpenStreetMap).
        </p>

        {/* Route genereren */}
        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-lg font-semibold">✨ Genereer een route</h2>

          <p className="mt-1 text-sm text-neutral-400">
            Kiest waar mogelijk wegen die je nog niet hebt gefietst. Geen garantie op een exacte afstand — probeer
            "Genereer opnieuw" voor een andere suggestie.
          </p>

          <form
            onSubmit={handleGenerate}
            className="mt-4 flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[220px]">
              <label className="mb-1 block text-xs text-neutral-500">
                Startadres
              </label>

              <input
                type="text"
                required
                value={startAddress}
                onChange={(e) => setStartAddress(e.target.value)}
                placeholder="bijv. Larikslaan, Leusden"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="flex items-center gap-2 pb-2">
              <input
                id="isLoop"
                type="checkbox"
                checked={isLoop}
                onChange={(e) => setIsLoop(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
              />
              <label htmlFor="isLoop" className="text-sm text-neutral-300">
                🔁 Rondje (start = eindpunt)
              </label>
            </div>

            {!isLoop && (
              <div className="flex-1 min-w-[220px]">
                <label className="mb-1 block text-xs text-neutral-500">
                  Eindadres
                </label>

                <input
                  type="text"
                  required={!isLoop}
                  value={endAddress}
                  onChange={(e) => setEndAddress(e.target.value)}
                  placeholder="bijv. Stationsplein, Amersfoort"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
                />
              </div>
            )}

            {isLoop && (
              <>
                <div className="w-28">
                  <label className="mb-1 block text-xs text-neutral-500">
                    Afstand (km)
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={150}
                    required
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="w-36">
                  <label className="mb-1 block text-xs text-neutral-500">
                    Nieuw (km, optioneel)
                  </label>

                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={desiredNewKm}
                    onChange={(e) => setDesiredNewKm(e.target.value)}
                    placeholder="geen voorkeur"
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="w-40">
                  <label className="mb-1 block text-xs text-neutral-500">
                    Richting (optioneel)
                  </label>

                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Geen voorkeur</option>
                    <option value="N">Noord</option>
                    <option value="NO">Noordoost</option>
                    <option value="O">Oost</option>
                    <option value="ZO">Zuidoost</option>
                    <option value="Z">Zuid</option>
                    <option value="ZW">Zuidwest</option>
                    <option value="W">West</option>
                    <option value="NW">Noordwest</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={generating}
              className="rounded-xl bg-[#d59a57] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {generating
                ? "Genereren..."
                : generatedRoute
                ? "Genereer opnieuw"
                : "Genereer route"}
            </button>
          </form>

          {generateError && (
            <p className="mt-3 text-sm text-red-400">{generateError}</p>
          )}

          {generatedStats && (
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-neutral-500">Startpunt</p>
                <p className="text-neutral-200">{generatedStats.startDisplayName}</p>
              </div>

              {generatedStats.endDisplayName && (
                <div>
                  <p className="text-neutral-500">Eindpunt</p>
                  <p className="text-neutral-200">{generatedStats.endDisplayName}</p>
                </div>
              )}

              <div>
                <p className="text-neutral-500">Totale afstand</p>
                <p className="font-semibold text-cyan-400">{generatedStats.distanceKm} km</p>
              </div>

              <div>
                <p className="text-neutral-500">Nieuwe wegen</p>
                <p className="font-semibold text-cyan-400">{generatedStats.newKm} km</p>
              </div>

              <div>
                <p className="text-neutral-500">Bekende wegen</p>
                <p className="text-neutral-200">{generatedStats.riddenKm} km</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 h-[520px] overflow-hidden rounded-2xl border border-neutral-800">
          {loading || generating ? (
            <div className="flex h-full items-center justify-center text-neutral-400">
              {generating ? "Route genereren..." : "Routes laden..."}
            </div>
          ) : filteredActivities.length === 0 && !generatedRoute ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-neutral-400">
              {activities.length === 0
                ? "Nog geen ritten met locatiegegevens gevonden. Synchroniseer je Strava-activiteiten opnieuw vanaf het dashboard."
                : "Geen ritten gevonden voor dit filter."}
            </div>
          ) : (
            <RoutesMap
              activities={filteredActivities}
              generatedRoute={generatedRoute || undefined}
            />
          )}
        </div>

        <p className="mt-3 text-sm text-neutral-500">
          {filteredActivities.length} van {activities.length} ritten met locatiegegevens.
        </p>
      </div>
    </main>
  );
}
