"use client";

import { useMemo } from "react";

const BRAND_COLOR = "#d59a57";

export default function RouteShape({
  points,
  size = 96,
}: {
  points: [number, number][];
  size?: number;
}) {
  const path = useMemo(() => {
    if (points.length < 2) {
      return null;
    }

    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Lengtegraad-correctie op basis van de gemiddelde breedtegraad, anders
    // oogt de vorm vervormd (1° lengtegraad is korter dan 1° breedtegraad).
    const lngScale = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));

    const widthDeg = (maxLng - minLng) * lngScale || 0.0001;
    const heightDeg = maxLat - minLat || 0.0001;

    const padding = size * 0.1;
    const innerSize = size - padding * 2;
    const scale = Math.min(innerSize / widthDeg, innerSize / heightDeg);

    const offsetX = (innerSize - widthDeg * scale) / 2;
    const offsetY = (innerSize - heightDeg * scale) / 2;

    const toXY = ([lat, lng]: [number, number]) => {
      const x = padding + offsetX + (lng - minLng) * lngScale * scale;
      const y = padding + offsetY + (maxLat - lat) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    };

    return `M ${points.map(toXY).join(" L ")}`;
  }, [points, size]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="shrink-0 rounded-xl bg-neutral-950"
    >
      {path && (
        <path
          d={path}
          fill="none"
          stroke={BRAND_COLOR}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
