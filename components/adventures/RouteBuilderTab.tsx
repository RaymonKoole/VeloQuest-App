"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { haversineDistanceMeters } from "@/lib/routes/haversine";
import { buildGpx } from "@/lib/routes/buildGpx";

const RouteBuilderMap = dynamic(() => import("@/components/adventures/RouteBuilderMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-neutral-500">
      Kaart laden...
    </div>
  ),
});

function slugifyFileName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "veloquest-route";
}

export default function RouteBuilderTab() {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [routeName, setRouteName] = useState("Mijn route");

  function addPoint(lat: number, lng: number) {
    setPoints((current) => [...current, [lat, lng]]);
  }

  function removePoint(index: number) {
    setPoints((current) => current.filter((_, i) => i !== index));
  }

  function undoLast() {
    setPoints((current) => current.slice(0, -1));
  }

  function clearAll() {
    setPoints([]);
  }

  const totalDistanceKm = useMemo(() => {
    let totalMeters = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const [lat1, lng1] = points[i];
      const [lat2, lng2] = points[i + 1];
      totalMeters += haversineDistanceMeters(lat1, lng1, lat2, lng2);
    }

    return Math.round((totalMeters / 1000) * 10) / 10;
  }, [points]);

  function downloadGpx() {
    const gpx = buildGpx(
      points.map(([lat, lng]) => ({ lat, lng })),
      routeName || "Mijn route"
    );

    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugifyFileName(routeName)}.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <>
      <p className="text-neutral-400">
        Klik op de kaart om zelf een route uit te stippelen, net als in Komoot. De punten worden
        met rechte lijnen verbonden — jij bepaalt dus zelf hoe gedetailleerd je klikt.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex-1 min-w-[220px]">
          <label className="mb-1 block text-xs text-neutral-500">Naam van de route</label>

          <input
            type="text"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
          />
        </div>

        <button
          type="button"
          onClick={undoLast}
          disabled={points.length === 0}
          className="rounded-xl bg-neutral-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-40"
        >
          ↩️ Ongedaan maken
        </button>

        <button
          type="button"
          onClick={clearAll}
          disabled={points.length === 0}
          className="rounded-xl bg-neutral-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-40"
        >
          🗑️ Wis alles
        </button>

        <button
          type="button"
          onClick={downloadGpx}
          disabled={points.length < 2}
          className="rounded-xl bg-[#d59a57] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          ⬇️ Download GPX
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-neutral-500">Punten</p>
          <p className="font-semibold text-neutral-200">{points.length}</p>
        </div>

        <div>
          <p className="text-neutral-500">Afstand</p>
          <p className="font-semibold text-cyan-400">{totalDistanceKm} km</p>
        </div>
      </div>

      <div className="mt-4 h-[520px] overflow-hidden rounded-2xl border border-neutral-800">
        <RouteBuilderMap points={points} onAddPoint={addPoint} onRemovePoint={removePoint} />
      </div>
    </>
  );
}
