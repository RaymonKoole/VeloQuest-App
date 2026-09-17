"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import { haversineDistanceMeters } from "@/lib/routes/haversine";
import { buildGpx } from "@/lib/routes/buildGpx";
import type { SegmentState } from "@/components/adventures/RouteBuilderMap";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

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

async function snapSegment(
  from: [number, number],
  to: [number, number]
): Promise<[number, number][] | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  try {
    const response = await fetch("/api/routes/snap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        from: { lat: from[0], lng: from[1] },
        to: { lat: to[0], lng: to[1] },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.points as [number, number][];
  } catch {
    return null;
  }
}

export default function RouteBuilderTab() {
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [segments, setSegments] = useState<SegmentState[]>([]);
  const [routeName, setRouteName] = useState("Mijn route");

  function addPoint(lat: number, lng: number) {
    const newPoint: [number, number] = [lat, lng];
    const previous = waypoints[waypoints.length - 1];

    setWaypoints((current) => [...current, newPoint]);

    if (!previous) {
      return;
    }

    const segmentIndex = waypoints.length - 1;

    setSegments((current) => [
      ...current,
      { status: "loading", points: [previous, newPoint] },
    ]);

    snapSegment(previous, newPoint).then((points) => {
      setSegments((current) => {
        const updated = [...current];

        if (updated[segmentIndex]) {
          updated[segmentIndex] = points
            ? { status: "done", points }
            : { status: "error", points: [previous, newPoint] };
        }

        return updated;
      });
    });
  }

  function removePoint(index: number) {
    const hasPrev = index > 0;
    const hasNext = index < waypoints.length - 1;
    const prevPoint = hasPrev ? waypoints[index - 1] : null;
    const nextPoint = hasNext ? waypoints[index + 1] : null;

    setWaypoints((current) => current.filter((_, i) => i !== index));

    setSegments((current) => {
      const updated = [...current];

      // Verwijder de segmenten aan weerszijden van dit punt (hoogste index
      // eerst, anders schuiven de indexen op tijdens het splitsen).
      if (hasNext) {
        updated.splice(index, 1);
      }

      if (hasPrev) {
        updated.splice(index - 1, 1);
      }

      // Als het punt tussen twee andere punten in zat, moet er een nieuw
      // verbindend segment voor in de plaats komen.
      if (hasPrev && hasNext && prevPoint && nextPoint) {
        updated.splice(index - 1, 0, { status: "loading", points: [prevPoint, nextPoint] });
      }

      return updated;
    });

    if (hasPrev && hasNext && prevPoint && nextPoint) {
      const insertAt = index - 1;

      snapSegment(prevPoint, nextPoint).then((points) => {
        setSegments((current) => {
          const updated = [...current];

          if (updated[insertAt]) {
            updated[insertAt] = points
              ? { status: "done", points }
              : { status: "error", points: [prevPoint, nextPoint] };
          }

          return updated;
        });
      });
    }
  }

  function undoLast() {
    setWaypoints((current) => current.slice(0, -1));
    setSegments((current) => current.slice(0, -1));
  }

  function clearAll() {
    setWaypoints([]);
    setSegments([]);
  }

  const isSnapping = segments.some((segment) => segment.status === "loading");
  const hasSnapErrors = segments.some((segment) => segment.status === "error");

  const routePoints = useMemo(() => {
    const points: [number, number][] = [];

    segments.forEach((segment, index) => {
      const segmentPoints = index === 0 ? segment.points : segment.points.slice(1);
      points.push(...segmentPoints);
    });

    if (points.length === 0 && waypoints.length > 0) {
      return waypoints;
    }

    return points;
  }, [segments, waypoints]);

  const totalDistanceKm = useMemo(() => {
    let totalMeters = 0;

    for (let i = 0; i < routePoints.length - 1; i++) {
      const [lat1, lng1] = routePoints[i];
      const [lat2, lng2] = routePoints[i + 1];
      totalMeters += haversineDistanceMeters(lat1, lng1, lat2, lng2);
    }

    return Math.round((totalMeters / 1000) * 10) / 10;
  }, [routePoints]);

  function downloadGpx() {
    const gpx = buildGpx(
      routePoints.map(([lat, lng]) => ({ lat, lng })),
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
        Klik op de kaart om zelf een route uit te stippelen, net als in Komoot. Tussen de punten
        wordt automatisch de weg gevolgd op basis van OpenStreetMap-data.
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
          disabled={waypoints.length === 0}
          className="rounded-xl bg-neutral-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-40"
        >
          ↩️ Ongedaan maken
        </button>

        <button
          type="button"
          onClick={clearAll}
          disabled={waypoints.length === 0}
          className="rounded-xl bg-neutral-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-40"
        >
          🗑️ Wis alles
        </button>

        <button
          type="button"
          onClick={downloadGpx}
          disabled={waypoints.length < 2}
          className="rounded-xl bg-[#d59a57] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          ⬇️ Download GPX
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-6 text-sm">
        <div>
          <p className="text-neutral-500">Punten</p>
          <p className="font-semibold text-neutral-200">{waypoints.length}</p>
        </div>

        <div>
          <p className="text-neutral-500">Afstand</p>
          <p className="font-semibold text-cyan-400">{totalDistanceKm} km</p>
        </div>

        {isSnapping && (
          <p className="text-sm text-neutral-400">🔄 Weg zoeken...</p>
        )}

        {!isSnapping && hasSnapErrors && (
          <p className="text-sm text-amber-400">
            ⚠️ Voor een deel van de route kon geen weg gevonden worden — daar is een rechte lijn getekend.
          </p>
        )}
      </div>

      <div className="mt-4 h-[520px] overflow-hidden rounded-2xl border border-neutral-800">
        <RouteBuilderMap waypoints={waypoints} segments={segments} onAddPoint={addPoint} onRemovePoint={removePoint} />
      </div>
    </>
  );
}
