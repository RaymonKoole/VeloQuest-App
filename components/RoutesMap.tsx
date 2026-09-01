"use client";

import { Fragment, useEffect, useMemo } from "react";
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

function clusterKey(activity: RouteActivity) {
  return `${activity.start_lat.toFixed(4)},${activity.start_lng.toFixed(4)}`;
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

function FitBounds({
  activities,
  generatedRoute,
}: {
  activities: RouteActivity[];
  generatedRoute?: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [
      ...activities.map(
        (activity) => [activity.start_lat, activity.start_lng] as [number, number]
      ),
      ...(generatedRoute || []),
    ];

    if (points.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(points);

    map.fitBounds(bounds, { padding: [40, 40] });
  }, [activities, generatedRoute, map]);

  return null;
}

export default function RoutesMap({
  activities,
  generatedRoute,
}: {
  activities: RouteActivity[];
  generatedRoute?: [number, number][];
}) {
  const clusters = useMemo(() => {
    const grouped = new Map<string, RouteActivity[]>();

    for (const activity of activities) {
      const key = clusterKey(activity);
      const existing = grouped.get(key);

      if (existing) {
        existing.push(activity);
      } else {
        grouped.set(key, [activity]);
      }
    }

    return Array.from(grouped.values());
  }, [activities]);

  const center: [number, number] =
    activities.length > 0
      ? [activities[0].start_lat, activities[0].start_lng]
      : [52.1, 5.3];

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

      {activities.map((activity) => {
        const polylinePoints = activity.summary_polyline
          ? decodePolyline(activity.summary_polyline)
          : null;

        if (!polylinePoints || polylinePoints.length < 2) {
          return null;
        }

        return (
          <Fragment key={`line-${activity.id}`}>
            {/* Donkere "casing" eronder zodat de lijn opvalt tegen elke ondergrond (ook rode wegen) */}
            <Polyline
              positions={polylinePoints}
              pathOptions={{
                color: BRAND_COLOR_DARK,
                weight: 7,
                opacity: 0.85,
                lineCap: "round",
                lineJoin: "round",
              }}
            />

            <Polyline
              positions={polylinePoints}
              pathOptions={{
                color: BRAND_COLOR,
                weight: 4,
                opacity: 1,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </Fragment>
        );
      })}

      {clusters.map((clusterActivities) => {
        const first = clusterActivities[0];

        return (
          <Marker
            key={clusterKey(first)}
            position={[first.start_lat, first.start_lng]}
            icon={clusterIcon(clusterActivities.length)}
          >
            <Popup maxHeight={240}>
              <div className="min-w-[200px]">
                {clusterActivities.length > 1 && (
                  <p className="mb-2 text-xs font-semibold text-neutral-500">
                    {clusterActivities.length} ritten gestart vanaf dit punt
                  </p>
                )}

                <div className="space-y-2">
                  {clusterActivities.slice(0, 10).map((activity) => (
                    <div
                      key={activity.id}
                      className="border-b border-neutral-200 pb-2 last:border-0 last:pb-0"
                    >
                      <p className="font-semibold text-neutral-900">
                        {activity.name || "Fietsrit"}
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

      {generatedRoute && generatedRoute.length > 1 && (
        <Polyline
          positions={generatedRoute}
          pathOptions={{
            color: "#22d3ee",
            weight: 5,
            opacity: 0.95,
            dashArray: "1, 10",
            lineCap: "round",
          }}
        />
      )}

      <FitBounds activities={activities} generatedRoute={generatedRoute} />
    </MapContainer>
  );
}
