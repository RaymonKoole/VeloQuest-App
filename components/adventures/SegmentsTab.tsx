"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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

function rankBadge(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}`;
}

export default function SegmentsTab() {
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
    <>
      <p className="text-neutral-400">
        De segmenten die jij het vaakst rijdt, en de segmenten die bij andere Strava-gebruikers het populairst zijn.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-neutral-400">Segmenten laden...</p>
      ) : error ? (
        <p className="mt-8 text-sm text-red-400">{error}</p>
      ) : data?.totalSegments === 0 ? (
        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-neutral-400">
            Nog geen segmentgegevens gevonden. Synchroniseer je Strava-ritten
            (bv. via "Verrijk nu" op de Jaaroverzicht-pagina) om ze hier te zien
            verschijnen.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d59a57]/15 text-xl">
                🔁
              </span>

              <div>
                <h2 className="text-xl font-bold">Meest bereden segmenten</h2>
                <p className="text-sm text-neutral-500">De segmenten die je het vaakst hebt gereden</p>
              </div>
            </div>

            {data.mostRiddenSegments.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">
                Nog geen segmenten gevonden.
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-950/60 text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
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
                    {data.mostRiddenSegments.map((segment: any, index: number) => (
                      <tr
                        key={segment.segmentId}
                        className={`transition hover:bg-neutral-800/60 ${
                          index % 2 === 0 ? "bg-neutral-950/40" : "bg-neutral-950/10"
                        }`}
                      >
                        <td className="px-4 py-3 text-neutral-400">{rankBadge(index)}</td>
                        <td className="px-4 py-3 font-medium">
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
                        <td className="px-4 py-3 font-semibold text-[#d59a57]">{segment.attempts}x</td>
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

            <p className="mt-3 text-xs text-neutral-600">
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

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-xl">
                ⭐
              </span>

              <div>
                <h2 className="text-xl font-bold">Populairste segmenten</h2>
                <p className="text-sm text-neutral-500">
                  Van de segmenten die jij hebt gereden: welke worden door Strava-gebruikers het vaakst als favoriet gemarkeerd
                </p>
              </div>
            </div>

            {!data.mostPopularSegments || data.mostPopularSegments.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">
                Nog geen populariteitsgegevens gevonden.
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-950/60 text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Segment</th>
                      <th className="px-4 py-3 font-medium">⭐ Favorieten</th>
                      <th className="px-4 py-3 font-medium">Wielrenners</th>
                      <th className="px-4 py-3 font-medium">Afstand</th>
                      <th className="px-4 py-3 font-medium">Jouw beste tijd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {data.mostPopularSegments.map((segment: any, index: number) => (
                      <tr
                        key={segment.segmentId}
                        className={`transition hover:bg-neutral-800/60 ${
                          index % 2 === 0 ? "bg-neutral-950/40" : "bg-neutral-950/10"
                        }`}
                      >
                        <td className="px-4 py-3 text-neutral-400">{rankBadge(index)}</td>
                        <td className="px-4 py-3 font-medium">{segment.name}</td>
                        <td className="px-4 py-3 font-semibold text-amber-400">
                          ⭐ {segment.starCount.toLocaleString("nl-NL")}
                        </td>
                        <td className="px-4 py-3 text-neutral-400">
                          {segment.athleteCount != null
                            ? segment.athleteCount.toLocaleString("nl-NL")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-neutral-400">
                          {segment.distanceKm != null ? `${segment.distanceKm} km` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {formatDuration(segment.bestElapsedSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
