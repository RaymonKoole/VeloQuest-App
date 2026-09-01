"use client";

import { Fragment, useEffect } from "react";
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

function FitBounds({ activities }: { activities: RouteActivity[] }) {
  const map = useMap();

  useEffect(() => {
    if (activities.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(
      activities.map(
        (activity) => [activity.start_lat, activity.start_lng] as [number, number]
      )
    );

    map.fitBounds(bounds, { padding: [40, 40] });
  }, [activities, map]);

  return null;
}

export default function RoutesMap({
  activities,
}: {
  activities: RouteActivity[];
}) {
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

        return (
          <Fragment key={activity.id}>
            {polylinePoints && polylinePoints.length > 1 && (
              <Polyline
                positions={polylinePoints}
                pathOptions={{ color: "#d59a57", weight: 3 }}
              />
            )}

            <Marker position={[activity.start_lat, activity.start_lng]}>
              <Popup>
                <strong>{activity.name || "Fietsrit"}</strong>
                <br />
                {((activity.distance || 0) / 1000).toFixed(1)} km
                {activity.city && (
                  <>
                    <br />
                    {activity.city}
                    {activity.country ? `, ${activity.country}` : ""}
                  </>
                )}
              </Popup>
            </Marker>
          </Fragment>
        );
      })}

      <FitBounds activities={activities} />
    </MapContainer>
  );
}
