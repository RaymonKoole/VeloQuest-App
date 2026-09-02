"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Slide = {
  emoji: string;
  title: string;
  big: string;
  sub: string;
  gradient: string;
};

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function WrappedPage() {
  const [data, setData] = useState<any>(null);
  const [stops, setStops] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [remainingToEnrich, setRemainingToEnrich] = useState<number | null>(null);
  const [remainingStreams, setRemainingStreams] = useState<number | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState("");

  async function getAuthHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return null;
    }

    return { Authorization: `Bearer ${session.access_token}` };
  }

  async function fetchWrapped(headers: Record<string, string>) {
    const response = await fetch("/api/wrapped", { headers });
    const json = await response.json();

    if (!response.ok) {
      setError(json.error || "Wrapped kon niet worden geladen.");
      return null;
    }

    setData(json);
    return json;
  }

  async function fetchStops(headers: Record<string, string>) {
    const response = await fetch("/api/stops", { headers });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    setStops(json);
    setRemainingStreams(json.remainingStreams ?? 0);
    return json;
  }

  useEffect(() => {
    async function loadWrapped() {
      const headers = await getAuthHeaders();

      if (!headers) {
        return;
      }

      await fetchWrapped(headers);
      setLoading(false);

      // Pauzeplekken (bv. cafés) verwerken duurt langer (Overpass-lookups);
      // laad dit los na de rest, zonder de Wrapped-kaarten te blokkeren.
      fetchStops(headers).catch((stopsError) => {
        console.error("Pauzeplekken laden mislukt:", stopsError);
      });

      // Elk bezoek aan Wrapped verrijkt op de achtergrond ook alvast een
      // volgende portie ritten (streams/segments/kudos), net als het
      // dashboard doet — zonder dat de gebruiker daarvoor iets hoeft te doen.
      fetch("/api/strava/sync", { method: "POST", headers })
        .then((r) => (r.ok ? r.json() : null))
        .then(async (syncJson) => {
          if (!syncJson) {
            return;
          }

          setRemainingToEnrich(syncJson.remainingToEnrich ?? 0);

          if ((syncJson.enrichedThisSync || 0) > 0) {
            await fetchWrapped(headers);
            await fetchStops(headers);
          }
        })
        .catch((syncError) => {
          console.error("Achtergrond-sync mislukt:", syncError);
        });
    }

    loadWrapped();
  }, []);

  async function handleEnrichMore() {
    setEnriching(true);
    setEnrichMessage("Ritten verrijken...");

    try {
      const headers = await getAuthHeaders();

      if (!headers) {
        return;
      }

      const syncResponse = await fetch("/api/strava/sync", {
        method: "POST",
        headers,
      });
      const syncJson = await syncResponse.json();

      if (!syncResponse.ok) {
        setEnrichMessage(syncJson.error || "Verrijken is niet gelukt.");
        return;
      }

      setRemainingToEnrich(syncJson.remainingToEnrich ?? 0);

      const stopsJson = await fetchStops(headers);
      await fetchWrapped(headers);

      const stillRemaining =
        (syncJson.remainingToEnrich || 0) + (stopsJson?.remainingStreams || 0);

      setEnrichMessage(
        stillRemaining > 0
          ? `${syncJson.enrichedThisSync || 0} ritten verrijkt, nog ongeveer ${stillRemaining} te gaan — klik gerust nog eens.`
          : "Alle ritten zijn verrijkt! 🎉"
      );
    } catch (enrichError) {
      console.error("Verrijken mislukt:", enrichError);
      setEnrichMessage("Verrijken is niet gelukt. Probeer het later opnieuw.");
    } finally {
      setEnriching(false);
    }
  }

  const slides: Slide[] = useMemo(() => {
    if (!data || !data.hasData) {
      return [];
    }

    const result: Slide[] = [];

    result.push({
      emoji: "🚴",
      title: "Jouw fietsjaar",
      big: `${data.totalRides}`,
      sub: "ritten gefietst met VeloQuest",
      gradient: "from-purple-600 via-purple-700 to-indigo-800",
    });

    result.push({
      emoji: "📏",
      title: "Totale afstand",
      big: `${data.totalDistanceKm.toLocaleString("nl-NL")} km`,
      sub:
        data.netherlandsComparison >= 0.1
          ? `Dat is ${data.netherlandsComparison}x Nederland van noord naar zuid!`
          : "Elke kilometer telt!",
      gradient: "from-orange-500 via-orange-600 to-red-700",
    });

    result.push({
      emoji: "⛰️",
      title: "Totale hoogtemeters",
      big: `${data.totalElevationM.toLocaleString("nl-NL")} m`,
      sub:
        data.everestComparison >= 0.05
          ? `Dat is ${data.everestComparison}x de Mount Everest!`
          : "Op naar meer hoogtemeters!",
      gradient: "from-emerald-600 via-emerald-700 to-teal-800",
    });

    result.push({
      emoji: "⏱️",
      title: "Tijd op de fiets",
      big: `${data.totalMovingTimeHours.toLocaleString("nl-NL")} uur`,
      sub: "puur fietsplezier",
      gradient: "from-blue-600 via-blue-700 to-cyan-800",
    });

    if (data.longestRide) {
      result.push({
        emoji: "🏆",
        title: "Langste rit",
        big: `${data.longestRide.distanceKm} km`,
        sub: data.longestRide.name || "Fietsrit",
        gradient: "from-pink-600 via-pink-700 to-rose-800",
      });
    }

    if (data.biggestClimb && data.biggestClimb.elevationM > 0) {
      result.push({
        emoji: "🧗",
        title: "Zwaarste klim",
        big: `${data.biggestClimb.elevationM.toLocaleString("nl-NL")} m`,
        sub: data.biggestClimb.name || "Fietsrit",
        gradient: "from-lime-600 via-green-700 to-emerald-800",
      });
    }

    if (data.fastestRide && data.fastestRide.speedKmh > 0) {
      result.push({
        emoji: "⚡",
        title: "Snelste gemiddelde",
        big: `${data.fastestRide.speedKmh} km/u`,
        sub: data.fastestRide.name || "Fietsrit",
        gradient: "from-yellow-500 via-amber-600 to-orange-700",
      });
    }

    if (data.favoritePlace) {
      result.push({
        emoji: "📍",
        title: "Favoriete vertrekpunt",
        big: data.favoritePlace.city,
        sub: `${data.favoritePlace.count} ritten vanaf hier, ${data.favoritePlace.country}`,
        gradient: "from-fuchsia-600 via-fuchsia-700 to-purple-800",
      });
    }

    if (data.uniquePlaces > 1) {
      result.push({
        emoji: "🗺️",
        title: "Ontdekte plekken",
        big: `${data.uniquePlaces}`,
        sub: "verschillende plaatsen als vertrekpunt",
        gradient: "from-teal-600 via-teal-700 to-cyan-800",
      });
    }

    if (data.bestMonth) {
      result.push({
        emoji: "📅",
        title: "Beste maand",
        big: capitalize(data.bestMonth.name),
        sub: `${data.bestMonth.distanceKm} km in die maand`,
        gradient: "from-indigo-600 via-indigo-700 to-blue-800",
      });
    }

    if (data.bestWeekday) {
      result.push({
        emoji: "🗓️",
        title: "Favoriete fietsdag",
        big: capitalize(data.bestWeekday),
        sub: "daarop zit jij het vaakst op de fiets",
        gradient: "from-red-600 via-red-700 to-pink-800",
      });
    }

    if (data.longestStreak > 1) {
      result.push({
        emoji: "🔥",
        title: "Langste reeks",
        big: `${data.longestStreak} dagen`,
        sub: "achter elkaar gefietst",
        gradient: "from-amber-500 via-orange-600 to-red-700",
      });
    }

    if (data.prCount > 0) {
      result.push({
        emoji: "🥇",
        title: "Persoonlijke records",
        big: `${data.prCount}`,
        sub: "nieuwe PR's op Strava-segmenten",
        gradient: "from-rose-600 via-red-700 to-orange-800",
      });
    }

    if (data.totalCalories > 0) {
      result.push({
        emoji: "🔥",
        title: "Verbrande calorieën",
        big: `${data.totalCalories.toLocaleString("nl-NL")} kcal`,
        sub: "dat heb je verdiend",
        gradient: "from-orange-600 via-red-600 to-rose-700",
      });
    }

    if (data.totalKudos > 0) {
      result.push({
        emoji: "👏",
        title: "Kudos ontvangen",
        big: `${data.totalKudos.toLocaleString("nl-NL")}`,
        sub: "van andere Strava-gebruikers",
        gradient: "from-sky-600 via-blue-700 to-indigo-800",
      });
    }

    if (data.avgDistanceKm > 0) {
      result.push({
        emoji: "📊",
        title: "Gemiddelde ritlengte",
        big: `${data.avgDistanceKm} km`,
        sub: "per rit, over het hele jaar",
        gradient: "from-cyan-600 via-sky-700 to-blue-800",
      });
    }

    if (data.favoriteSegment) {
      result.push({
        emoji: "🚵",
        title: "Favoriete klim of stuk",
        big: data.favoriteSegment.name,
        sub: `${data.favoriteSegment.count}x bereden Strava-segment`,
        gradient: "from-green-600 via-emerald-700 to-teal-800",
      });
    }

    if (stops?.favoriteStop) {
      result.push({
        emoji: "☕",
        title: "Favoriete pauzeplek",
        big: stops.favoriteStop.name,
        sub: `${stops.favoriteStop.count}x hier gestopt onderweg`,
        gradient: "from-amber-700 via-orange-800 to-yellow-900",
      });
    }

    if (stops?.totalStops > 0) {
      result.push({
        emoji: "🅿️",
        title: "Onderweg gestopt",
        big: `${stops.totalStops}x`,
        sub:
          stops.totalStopsWithPoi > 0
            ? `waarvan ${stops.totalStopsWithPoi}x bij een herkenbare plek`
            : "even pauze onderweg",
        gradient: "from-stone-600 via-neutral-700 to-zinc-800",
      });
    }

    if (stops?.longestStop) {
      const minutes = Math.round(stops.longestStop.durationSeconds / 60);
      result.push({
        emoji: "😴",
        title: "Langste pauze",
        big: `${minutes} min`,
        sub: stops.longestStop.poiName
          ? `bij ${stops.longestStop.poiName}`
          : "ergens onderweg",
        gradient: "from-indigo-700 via-violet-800 to-purple-900",
      });
    }

    result.push({
      emoji: "✨",
      title: "Level & XP",
      big: `Level ${data.level}`,
      sub: `${data.totalXp.toLocaleString("nl-NL")} XP verdiend`,
      gradient: "from-purple-600 via-fuchsia-700 to-pink-800",
    });

    if (data.totalBadges > 0) {
      result.push({
        emoji: "🏅",
        title: "Achievements",
        big: `${data.unlockedBadges}/${data.totalBadges}`,
        sub: "badges ontgrendeld",
        gradient: "from-yellow-600 via-amber-700 to-orange-800",
      });
    }

    if (data.totalQuests > 0) {
      result.push({
        emoji: "⚔️",
        title: "Quests",
        big: `${data.completedQuests}/${data.totalQuests}`,
        sub: "quests voltooid",
        gradient: "from-violet-600 via-violet-700 to-indigo-800",
      });
    }

    result.push({
      emoji: "🎉",
      title: "Bedankt voor een geweldig fietsjaar!",
      big: "Tot de volgende rit",
      sub: "Blijf fietsen met VeloQuest 🚴",
      gradient: "from-purple-700 via-fuchsia-700 to-pink-700",
    });

    return result;
  }, [data, stops]);

  function goTo(newIndex: number) {
    setIndex(Math.max(0, Math.min(slides.length - 1, newIndex)));
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, slides.length]);

  const slide = slides[index];

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Navbar active="/wrapped" />

        <h1 className="text-3xl font-bold">✨ Wrapped</h1>

        <p className="mt-1 text-neutral-400">
          Jouw fietsjaar in een notendop, gebaseerd op je Strava-ritten.
        </p>

        {!loading &&
          !error &&
          ((remainingToEnrich ?? 0) > 0 || (remainingStreams ?? 0) > 0 || enrichMessage) && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm">
              <span className="text-neutral-400">
                Sommige ritten missen nog details (cafés, segmenten, kudos) — dit
                vult zich geleidelijk aan.
              </span>

              <button
                type="button"
                onClick={handleEnrichMore}
                disabled={enriching}
                className="rounded-lg bg-[#d59a57] px-3 py-1.5 text-sm font-medium text-neutral-950 hover:opacity-90 disabled:opacity-50"
              >
                {enriching ? "Bezig..." : "🔄 Verrijk nu"}
              </button>

              {enrichMessage && (
                <span className="text-neutral-500">{enrichMessage}</span>
              )}
            </div>
          )}

        {loading ? (
          <p className="mt-8 text-sm text-neutral-400">Wrapped laden...</p>
        ) : error ? (
          <p className="mt-8 text-sm text-red-400">{error}</p>
        ) : slides.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-neutral-400">
              Nog geen ritten gevonden. Koppel Strava en synchroniseer je activiteiten om je Wrapped te zien.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            {/* Voortgangsbalkjes, zoals Instagram/Spotify stories */}
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Ga naar kaart ${i + 1}`}
                  className={`h-1.5 flex-1 rounded-full transition ${
                    i === index ? "bg-white" : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            <div
              className={`relative mt-4 flex h-[480px] select-none flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br p-10 text-center shadow-2xl ${slide.gradient}`}
            >
              <button
                type="button"
                aria-label="Vorige"
                onClick={() => goTo(index - 1)}
                className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize"
              />
              <button
                type="button"
                aria-label="Volgende"
                onClick={() => goTo(index + 1)}
                className="absolute inset-y-0 right-0 w-1/3 cursor-e-resize"
              />

              <span className="text-6xl">{slide.emoji}</span>

              <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-white/70">
                {slide.title}
              </p>

              <p className="mt-3 text-5xl font-extrabold leading-tight break-words">
                {slide.big}
              </p>

              <p className="mt-4 max-w-md text-white/80">{slide.sub}</p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
              >
                ← Vorige
              </button>

              <span className="text-sm text-neutral-500">
                {index + 1} / {slides.length}
              </span>

              <button
                type="button"
                onClick={() => goTo(index + 1)}
                disabled={index === slides.length - 1}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
              >
                Volgende →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
