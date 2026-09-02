"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "-";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatPopularity(athleteCount: number | null, effortCount: number | null) {
  if (athleteCount == null) {
    return null;
  }

  const athletes = athleteCount.toLocaleString("nl-NL");

  return effortCount != null
    ? `${athletes} wielrenners · ${effortCount.toLocaleString("nl-NL")}x gereden`
    : `${athletes} wielrenners`;
}

export default function SegmentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSegments() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/segments", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await response.json();

      if (!response.ok) {
        setError(json.error || "Segmenten konden niet worden geladen.");
        setLoading(false);
        return;
      }

      setData(json);
      setLoading(false);
    }

    loadSegments();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Navbar active="/segments" />

        <h1 className="text-3xl font-bold">🚵 Segmenten</h1>

        <p className="mt-1 text-neutral-400">
          Jouw persoonlijke records en meest bereden Strava-segmenten.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-neutral-400">Segmenten laden...</p>
        ) : error ? (
          <p className="mt-8 text-sm text-red-400">{error}</p>
        ) : data?.totalSegments === 0 ? (
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-neutral-400">
              Nog geen segmentgegevens gevonden. Synchroniseer je Strava-ritten
              (bv. via "Verrijk nu" op de Wrapped-pagina) om ze hier te zien
              verschijnen.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            <section>
              <h2 className="text-2xl font-bold">🏆 Jouw persoonlijke records</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {data.totalPrSegments > data.prSegments.length
                  ? `Top ${data.prSegments.length} van je ${data.totalPrSegments} PR's, gesorteerd op populariteit van het segment`
                  : `${data.prSegments.length} segment(en) waar je de snelste van jezelf op staat`}
              </p>

              {data.prSegments.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-500">
                  Nog geen PR's gevonden op verrijkte ritten.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {data.prSegments.map((segment: any) => {
                    const popularity = formatPopularity(segment.athleteCount, segment.effortCount);

                    return (
                      <div
                        key={segment.segmentId}
                        className="rounded-xl border border-amber-500/30 bg-neutral-900 p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold">{segment.name}</h3>

                          {segment.bestKomRank && (
                            <span
                              title={`Top 10 op dit segment (#${segment.bestKomRank})`}
                              className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400"
                            >
                              👑 #{segment.bestKomRank}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <p className="text-xl font-bold text-[#d59a57]">
                            {formatDuration(segment.bestElapsedSeconds)}
                          </p>

                          {segment.distanceKm != null && (
                            <p className="text-sm text-neutral-400">
                              {segment.distanceKm} km
                              {segment.averageGrade != null
                                ? ` · ${segment.averageGrade > 0 ? "+" : ""}${segment.averageGrade}%`
                                : ""}
                            </p>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-neutral-500">
                          {segment.attempts}x gereden
                          {segment.lastRiddenDate
                            ? ` · laatst op ${new Date(segment.lastRiddenDate).toLocaleDateString("nl-NL")}`
                            : ""}
                        </p>

                        {popularity && (
                          <p className="mt-1 text-xs text-neutral-600">
                            🌍 {popularity}
                            {segment.starCount ? (
                              <span title="Aantal Strava-gebruikers dat dit segment als favoriet heeft gemarkeerd (een 'ster' geven, vergelijkbaar met bookmarken)">
                                {" "}
                                · ⭐ {segment.starCount} favoriet
                              </span>
                            ) : (
                              ""
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-bold">🔁 Meest bereden segmenten</h2>
              <p className="mt-1 text-sm text-neutral-500">
                De segmenten die je het vaakst hebt gereden
              </p>

              {data.mostRiddenSegments.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-500">
                  Nog geen segmenten gevonden.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-900 text-neutral-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Segment</th>
                        <th className="px-4 py-3 font-medium">Afstand</th>
                        <th className="px-4 py-3 font-medium">Gem. helling</th>
                        <th className="px-4 py-3 font-medium">Aantal keer</th>
                        <th className="px-4 py-3 font-medium">Beste tijd</th>
                        <th className="px-4 py-3 font-medium">Populariteit</th>
                        <th className="px-4 py-3 font-medium">PR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {data.mostRiddenSegments.map((segment: any) => (
                        <tr key={segment.segmentId} className="bg-neutral-950">
                          <td className="px-4 py-3">
                            {segment.name}
                            {segment.bestKomRank && (
                              <span
                                title={`Top 10 op dit segment (#${segment.bestKomRank})`}
                                className="ml-2 text-xs text-amber-400"
                              >
                                👑#{segment.bestKomRank}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-neutral-400">
                            {segment.distanceKm != null ? `${segment.distanceKm} km` : "-"}
                          </td>
                          <td className="px-4 py-3 text-neutral-400">
                            {segment.averageGrade != null
                              ? `${segment.averageGrade > 0 ? "+" : ""}${segment.averageGrade}%`
                              : "-"}
                          </td>
                          <td className="px-4 py-3">{segment.attempts}x</td>
                          <td className="px-4 py-3">
                            {formatDuration(segment.bestElapsedSeconds)}
                          </td>
                          <td className="px-4 py-3 text-neutral-400">
                            {segment.athleteCount != null
                              ? `${segment.athleteCount.toLocaleString("nl-NL")} wielrenners`
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            {segment.isPr ? "🏆" : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-2 text-xs text-neutral-600">
                "Populariteit" is het aantal unieke Strava-gebruikers dat dit
                segment ooit heeft gereden. ⭐ is het aantal Strava-gebruikers
                dat het segment als favoriet heeft gemarkeerd (vergelijkbaar
                met bookmarken). Een exacte ranglijstpositie of top-%
                t.o.v. alle Strava-gebruikers is via de beschikbare Strava-API
                niet betrouwbaar op te vragen (die ranglijst-functie is voor de
                meeste apps afgeschermd) — 👑 toont wel je beste
                top-10-notering (KOM/QOM) op een segment, wanneer je die ooit
                had.
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
