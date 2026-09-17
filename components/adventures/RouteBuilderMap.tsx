"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BRAND_COLOR = "#d59a57";
const BRAND_COLOR_DARK = "#2a1608";
const DEFAULT_CENTER: [number, number] = [52.1, 5.3];

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

export default function RouteBuilderMap({
  points,
  onAddPoint,
  onRemovePoint,
}: {
  points: [number, number][];
  onAddPoint: (lat: number, lng: number) => void;
  onRemovePoint: (index: number) => void;
}) {
  const center = points.length > 0 ? points[0] : DEFAULT_CENTER;

  return (
    <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler onAddPoint={onAddPoint} />

      {points.length > 1 && (
        <>
          <Polyline
            positions={points}
            pathOptions={{
              color: BRAND_COLOR_DARK,
              weight: 6,
              opacity: 0.8,
              lineCap: "round",
              lineJoin: "round",
            }}
          />

          <Polyline
            positions={points}
            pathOptions={{
              color: BRAND_COLOR,
              weight: 3,
              opacity: 1,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </>
      )}

      {points.map((point, index) => (
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
    </MapContainer>
  );
}
