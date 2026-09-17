"use client";

import { Fragment } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BRAND_COLOR = "#d59a57";
const BRAND_COLOR_DARK = "#2a1608";
const ERROR_COLOR = "#f87171";
const DEFAULT_CENTER: [number, number] = [52.1, 5.3];

export type SegmentState = {
  status: "loading" | "done" | "error";
  points: [number, number][];
  /** Highway-tag per stuk tussen points[i] en points[i+1] (alleen aanwezig bij status "done"). */
  highways?: (string | null)[];
};

type RoadCategory = "fietspad" | "rustig" | "druk" | "onbekend";

const BUSY_HIGHWAYS = new Set(["primary", "primary_link", "secondary", "secondary_link"]);

function categoryFor(highway: string | null | undefined): RoadCategory {
  if (!highway) {
    return "onbekend";
  }

  if (highway === "cycleway") {
    return "fietspad";
  }

  if (BUSY_HIGHWAYS.has(highway)) {
    return "druk";
  }

  return "rustig";
}

const CATEGORY_COLORS: Record<RoadCategory, string> = {
  fietspad: "#22c55e",
  rustig: BRAND_COLOR,
  druk: "#f97316",
  onbekend: ERROR_COLOR,
};

const CATEGORY_LABELS: Record<RoadCategory, string> = {
  fietspad: "Fietspad",
  rustig: "Rustige weg",
  druk: "Drukke weg",
  onbekend: "Onbekend (rechte lijn)",
};

function pinIcon(index: number) {
  return L.divIcon({
    html: `<div style="background:${BRAND_COLOR};color:#241505;font-weight:700;font-size:12px;width:26px;height:26px;border-radius:9999px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.45);">${index + 1}</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

function ClickHandler({ onAddPoint }: { onAddPoint: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onAddPoint(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

// Groepeer aaneengesloten stukken met dezelfde wegcategorie tot één polyline,
// zodat we niet voor elke losse OSM-edge een aparte polyline hoeven te tekenen.
function groupByCategory(segment: SegmentState) {
  const groups: { category: RoadCategory; points: [number, number][] }[] = [];

  if (segment.status !== "done" || !segment.highways) {
    return [{ category: "onbekend" as RoadCategory, points: segment.points }];
  }

  for (let i = 0; i < segment.points.length - 1; i++) {
    const category = categoryFor(segment.highways[i]);
    const from = segment.points[i];
    const to = segment.points[i + 1];
    const last = groups[groups.length - 1];

    if (last && last.category === category) {
      last.points.push(to);
    } else {
      groups.push({ category, points: [from, to] });
    }
  }

  return groups;
}

export default function RouteBuilderMap({
  waypoints,
  segments,
  onAddPoint,
  onRemovePoint,
}: {
  waypoints: [number, number][];
  segments: SegmentState[];
  onAddPoint: (lat: number, lng: number) => void;
  onRemovePoint: (index: number) => void;
}) {
  const center = waypoints.length > 0 ? waypoints[0] : DEFAULT_CENTER;
  const usedCategories = new Set<RoadCategory>();

  return (
    <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler onAddPoint={onAddPoint} />

      {segments.map((segment, index) => {
        const isFallback = segment.status !== "done";
        const groups = groupByCategory(segment);

        return (
          <Fragment key={`segment-${index}`}>
            {groups.map((group, groupIndex) => {
              usedCategories.add(group.category);
              const color = CATEGORY_COLORS[group.category];

              return (
                <Fragment key={`segment-${index}-${groupIndex}`}>
                  <Polyline
                    positions={group.points}
                    pathOptions={{
                      color: BRAND_COLOR_DARK,
                      weight: 6,
                      opacity: isFallback ? 0.4 : 0.8,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />

                  <Polyline
                    positions={group.points}
                    pathOptions={{
                      color,
                      weight: 3,
                      opacity: isFallback ? 0.6 : 1,
                      dashArray: isFallback ? "6, 8" : undefined,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                </Fragment>
              );
            })}
          </Fragment>
        );
      })}

      {waypoints.map((point, index) => (
        <Marker key={`${index}-${point[0]}-${point[1]}`} position={point} icon={pinIcon(index)}>
          <Popup>
            <div className="min-w-[140px]">
              <p className="text-sm font-semibold text-neutral-900">Punt {index + 1}</p>

              <button
                type="button"
                onClick={() => onRemovePoint(index)}
                className="mt-2 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
              >
                ✕ Verwijder dit punt
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {usedCategories.size > 0 && (
        <div className="leaflet-bottom leaflet-left">
          <div className="leaflet-control m-2 rounded-lg bg-white/95 px-3 py-2 text-xs text-neutral-800 shadow">
            {Array.from(usedCategories)
              .sort((a, b) => Object.keys(CATEGORY_LABELS).indexOf(a) - Object.keys(CATEGORY_LABELS).indexOf(b))
              .map((category) => (
                <div key={category} className="flex items-center gap-2 py-0.5">
                  <span
                    className="inline-block h-2 w-4 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[category] }}
                  />
                  {CATEGORY_LABELS[category]}
                </div>
              ))}
          </div>
        </div>
      )}
    </MapContainer>
  );
}
