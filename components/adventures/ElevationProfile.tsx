"use client";

import { useMemo, useRef, useState } from "react";
import type { ElevationPoint } from "@/lib/routes/elevationProfile";

const BRAND_COLOR = "#d59a57";

const WIDTH = 600;
const HEIGHT = 200;
const PADDING = { top: 12, right: 12, bottom: 28, left: 44 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

export default function ElevationProfile({ points }: { points: ElevationPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { path, areaPath, xScale, yScale, minEl, maxEl, maxDistance, yTicks } = useMemo(() => {
    const distances = points.map((p) => p.distanceKm);
    const elevations = points.map((p) => p.elevationM);

    const maxDistance = Math.max(...distances, 0.1);
    const minElRaw = Math.min(...elevations);
    const maxElRaw = Math.max(...elevations);
    // Minstens 10m marge zodat een vlakke rit niet als één platte lijn tegen
    // de randen aan oogt.
    const minEl = roundToStep(minElRaw - Math.max(5, (maxElRaw - minElRaw) * 0.1), 10);
    const maxEl = roundToStep(maxElRaw + Math.max(5, (maxElRaw - minElRaw) * 0.1), 10);
    const elRange = maxEl - minEl || 1;

    const xScale = (distanceKm: number) => PADDING.left + (distanceKm / maxDistance) * PLOT_WIDTH;
    const yScale = (elevationM: number) =>
      PADDING.top + (1 - (elevationM - minEl) / elRange) * PLOT_HEIGHT;

    const linePoints = points.map((p) => `${xScale(p.distanceKm)},${yScale(p.elevationM)}`);
    const path = `M ${linePoints.join(" L ")}`;

    const baseline = PADDING.top + PLOT_HEIGHT;
    const areaPath =
      points.length > 0
        ? `M ${xScale(points[0].distanceKm)},${baseline} L ${linePoints.join(" L ")} L ${xScale(
            points[points.length - 1].distanceKm
          )},${baseline} Z`
        : "";

    const yTicks = [minEl, (minEl + maxEl) / 2, maxEl];

    return { path, areaPath, xScale, yScale, minEl, maxEl, maxDistance, yTicks };
  }, [points]);

  if (points.length < 2) {
    return (
      <p className="text-sm text-neutral-500">Onvoldoende hoogtedata voor een profiel.</p>
    );
  }

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const distanceAtCursor = ((relativeX - PADDING.left) / PLOT_WIDTH) * maxDistance;

    let nearest = 0;
    let nearestDiff = Infinity;

    for (let i = 0; i < points.length; i++) {
      const diff = Math.abs(points[i].distanceKm - distanceAtCursor);

      if (diff < nearestDiff) {
        nearestDiff = diff;
        nearest = i;
      }
    }

    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const xTicks = [0, maxDistance / 2, maxDistance];

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#404040"
              strokeWidth={1}
            />
            <text x={PADDING.left - 8} y={yScale(tick) + 3} textAnchor="end" fontSize={10} fill="#a3a3a3">
              {Math.round(tick)}m
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <text
            key={tick}
            x={xScale(tick)}
            y={HEIGHT - 8}
            textAnchor={tick === 0 ? "start" : tick === maxDistance ? "end" : "middle"}
            fontSize={10}
            fill="#a3a3a3"
          >
            {tick.toFixed(1)} km
          </text>
        ))}

        <path d={areaPath} fill={BRAND_COLOR} opacity={0.1} />
        <path d={path} fill="none" stroke={BRAND_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hovered && (
          <>
            <line
              x1={xScale(hovered.distanceKm)}
              x2={xScale(hovered.distanceKm)}
              y1={PADDING.top}
              y2={PADDING.top + PLOT_HEIGHT}
              stroke="#737373"
              strokeWidth={1}
            />
            <circle
              cx={xScale(hovered.distanceKm)}
              cy={yScale(hovered.elevationM)}
              r={4}
              fill={BRAND_COLOR}
              stroke="#171717"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-1 rounded-lg border border-neutral-700 bg-neutral-950/95 px-2 py-1 text-xs text-neutral-200 shadow"
          style={{
            left: `${Math.min(88, Math.max(0, (xScale(hovered.distanceKm) / WIDTH) * 100))}%`,
            transform:
              xScale(hovered.distanceKm) / WIDTH > 0.8 ? "translateX(-100%)" : "translateX(0)",
          }}
        >
          <p className="font-semibold text-[#d59a57]">{Math.round(hovered.elevationM)} m</p>
          <p className="text-neutral-400">{hovered.distanceKm.toFixed(1)} km</p>
        </div>
      )}
    </div>
  );
}
