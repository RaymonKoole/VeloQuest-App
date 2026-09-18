"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { decodePolyline } from "@/lib/routes/decodePolyline";
import { haversineDistanceMeters } from "@/lib/routes/haversine";
import { buildGpx, slugifyFileName } from "@/lib/routes/buildGpx";
import type { RouteSegment } from "@/lib/routes/dedupeRouteSegments";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const BRAND_COLOR = "#d59a57";
const BRAND_COLOR_DARK = "#2a1608";

export type RouteActivity = {
  id: number;
  name: string | null;
  activity_type: string | null;
  distance: number | null;
  start_date: string | null;
  start_lat: number;
  start_lng: number;
  summary_polyline: string | null;
  city: string | null;
  country: string | null;
  photo_url: string | null;
};

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "";
  }

  return new Date(dateString).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Rides starting a few meters apart (e.g. same street, different exact GPS
// fix) should still cluster together, so group by proximity rather than by
// snapping to a fixed grid (which has hard boundary artifacts).
const CLUSTER_RADIUS_M = 40;

function clusterActivitiesByProximity(activities: RouteActivity[]) {
  const clusters: RouteActivity[][] = [];

  for (const activity of activities) {
    const match = clusters.find(
      (cluster) =>
        haversineDistanceMeters(
          cluster[0].start_lat,
          cluster[0].start_lng,
          activity.start_lat,
          activity.start_lng
        ) <= CLUSTER_RADIUS_M
    );

    if (match) {
      match.push(activity);
    } else {
      clusters.push([activity]);
    }
  }

  return clusters;
}

function clusterIcon(count: number) {
  if (count <= 1) {
    return new L.Icon.Default();
  }

  return L.divIcon({
    html: `<div style="background:${BRAND_COLOR};color:#241505;font-weight:700;font-size:12px;width:28px;height:28px;border-radius:9999px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.45);">${count}</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function FitBounds({ activities }: { activities: RouteActivity[] }) {
  const map = useMap();

  useEffect(() => {
    // De kaart wordt dynamic (ssr:false) ingeladen in een container die pas
    // net zijn uiteindelijke afmeting krijgt (de "Kaart laden..."-placeholder
    // wordt vervangen); Leaflet meet zijn eigen containergrootte alleen bij
    // initialisatie. Zonder invalidateSize() blijft Leaflet's interne
    // pixel-origin gebaseerd op die eerste (mogelijk verouderde) afmeting.
    map.invalidateSize();

    const points: [number, number][] = activities.map(
      (activity) => [activity.start_lat, activity.start_lng] as [number, number]
    );

    if (points.length === 0) {
      return;
    }

    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [activities, map]);

  // Bewust geen tweede fitBounds op de geselecteerde route: dat opnieuw
  // inzoomen vlak nadat een klik ook een popup opent, corrumpeerde de
  // popup-positionering (Leaflet plaatste 'm duizenden pixels buiten beeld).
  // Selectie blijft zichtbaar via de gemarkeerde routekleur en de
  // "✕ Toon alle routes"-knop.

  return null;
}

function downloadActivityGpx(activity: RouteActivity, points: [number, number][]) {
  const gpx = buildGpx(
    points.map(([lat, lng]) => ({ lat, lng })),
    activity.name || "Fietsrit"
  );

  const blob = new Blob([gpx], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugifyFileName(activity.name || "veloquest-rit")}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function RoutesMap({
  activities,
  showAllActivities = true,
  dedupedSegments = [],
}: {
  activities: RouteActivity[];
  showAllActivities?: boolean;
  dedupedSegments?: RouteSegment[];
}) {
  const clusters = useMemo(
    () => clusterActivitiesByProximity(activities),
    [activities]
  );

  // Stabiele positie-referentie per cluster: een inline array-literal in JSX
  // (`[first.start_lat, first.start_lng]`) is een NIEUW object bij elke
  // render, ook als de waarden gelijk blijven — dat verwart react-leaflet's
  // Marker/Popup-positionering bij re-renders die niets met de kaartdata te
  // maken hebben (bv. het aanklikken van een marker zelf).
  const clusterPositions = useMemo(
    () =>
      clusters.map(
        (clusterActivities) =>
          [clusterActivities[0].start_lat, clusterActivities[0].start_lng] as [number, number]
      ),
    [clusters]
  );

  const center: [number, number] =
    activities.length > 0
      ? [activities[0].start_lat, activities[0].start_lng]
      : [52.1, 5.3];

  const [selectedIds, setSelectedIds] = useState<Set<number> | null>(null);

  const activityPolylines = useMemo(() => {
    const map = new Map<number, [number, number][]>();

    for (const activity of activities) {
      if (!activity.summary_polyline) {
        continue;
      }

      const points = decodePolyline(activity.summary_polyline);

      if (points.length > 1) {
        map.set(activity.id, points);
      }
    }

    return map;
  }, [activities]);

  function selectCluster(clusterActivities: RouteActivity[]) {
    const ids = new Set(clusterActivities.map((activity) => activity.id));

    setSelectedIds((current) => {
      if (
        current &&
        current.size === ids.size &&
        [...ids].every((id) => current.has(id))
      ) {
        return null;
      }

      return ids;
    });
  }

  return (
    <MapContainer
      center={center}
      zoom={7}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {showAllActivities
        ? activities.map((activity) => {
            const polylinePoints = activityPolylines.get(activity.id);

            if (!polylinePoints) {
              return null;
            }

            const isSelected = selectedIds?.has(activity.id) ?? false;
            const isDimmed = Boolean(selectedIds) && !isSelected;

            return (
              <Fragment key={`line-${activity.id}`}>
                {/* Donkere "casing" eronder zodat de lijn opvalt tegen elke ondergrond (ook rode wegen);
                    ook het klikbare gebied (breder dan de zichtbare lijn, makkelijker te raken) */}
                <Polyline
                  positions={polylinePoints}
                  pathOptions={{
                    color: isSelected ? "#7c4a12" : BRAND_COLOR_DARK,
                    weight: isSelected ? 9 : 7,
                    opacity: isDimmed ? 0.12 : 0.85,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  eventHandlers={{
                    click: () => selectCluster([activity]),
                  }}
                />

                <Polyline
                  positions={polylinePoints}
                  pathOptions={{
                    color: isSelected ? "#ffd76a" : BRAND_COLOR,
                    weight: isSelected ? 6 : 4,
                    opacity: isDimmed ? 0.12 : 1,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  eventHandlers={{
                    click: () => selectCluster([activity]),
                  }}
                />
              </Fragment>
            );
          })
        : dedupedSegments.length > 0 && (
            // Alle unieke gereden wegstukken in één multi-polyline: elk stuk
            // weg wordt zo maar één keer getekend, ongeacht hoeveel
            // activiteiten erover gingen.
            <Fragment key="deduped-segments">
              <Polyline
                positions={dedupedSegments}
                pathOptions={{
                  color: BRAND_COLOR_DARK,
                  weight: 7,
                  opacity: 0.85,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />

              <Polyline
                positions={dedupedSegments}
                pathOptions={{
                  color: BRAND_COLOR,
                  weight: 4,
                  opacity: 1,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </Fragment>
          )}

      {clusters.map((clusterActivities, index) => {
        const first = clusterActivities[0];

        return (
          <Marker
            key={first.id}
            position={clusterPositions[index]}
            icon={clusterIcon(clusterActivities.length)}
            eventHandlers={{
              click: () => selectCluster(clusterActivities),
            }}
          >
            <Popup
              position={clusterPositions[index]}
              maxHeight={220}
              autoPanPadding={[24, 24]}
              autoPanPaddingTopLeft={[24, 70]}
            >
              <div className="min-w-[200px]">
                {clusterActivities.length > 1 && (
                  <p className="mb-2 text-xs font-semibold text-neutral-500">
                    {clusterActivities.length} ritten gestart vanaf dit punt — klik een rit voor de route
                  </p>
                )}

                <div className="space-y-2">
                  {clusterActivities.slice(0, 10).map((activity) => (
                    <div
                      key={activity.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectCluster([activity]);
                      }}
                      className="flex cursor-pointer gap-3 border-b border-neutral-200 pb-2 transition hover:bg-neutral-50 last:border-0 last:pb-0"
                    >
                      {activity.photo_url && (
                        <img
                          src={activity.photo_url}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      )}

                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900">
                          {activity.name || "Fietsrit"}
                          {!activityPolylines.get(activity.id) && (
                            <span className="ml-1 text-xs font-normal text-neutral-400">
                              (geen route opgeslagen)
                            </span>
                          )}
                        </p>

                        <p className="text-xs text-neutral-600">
                          {formatDate(activity.start_date)} ·{" "}
                          {((activity.distance || 0) / 1000).toFixed(1)} km
                        </p>

                        {activity.city && (
                          <p className="text-xs text-neutral-500">
                            {activity.city}
                            {activity.country ? `, ${activity.country}` : ""}
                          </p>
                        )}

                        {activityPolylines.get(activity.id) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadActivityGpx(activity, activityPolylines.get(activity.id)!);
                            }}
                            className="mt-1 rounded-lg bg-neutral-800 px-2 py-1 text-xs font-semibold text-white hover:bg-neutral-700"
                          >
                            ⬇️ GPX
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {clusterActivities.length > 10 && (
                    <p className="text-xs text-neutral-500">
                      + {clusterActivities.length - 10} meer...
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      <FitBounds activities={activities} />

      {selectedIds && (
        <div className="leaflet-top leaflet-right">
          <div className="leaflet-control leaflet-bar">
            <button
              type="button"
              onClick={() => setSelectedIds(null)}
              className="bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
            >
              ✕ Toon alle routes
            </button>
          </div>
        </div>
      )}
    </MapContainer>
  );
}
