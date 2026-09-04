import { haversineDistanceMeters } from "@/lib/routes/haversine";

export type RouteSegment = [number, number][];

// Rondt GPS-punten af op een grid-cel zodat kleine GPS-afwijkingen tussen
// ritten over dezelfde weg niet als een ander stukje weg worden gezien.
const DEFAULT_CELL_SIZE_DEGREES = 0.0004; // ~30-45m in Nederland

// Ritten worden vóór het snappen op het grid eerst herbemonsterd op deze
// vaste afstand. Zonder dit slaan twee ritten over dezelfde straat vrijwel
// nooit GPS-punten op exact dezelfde plek op (Strava's opnamedichtheid
// varieert per rit), waardoor ze anders zelden op dezelfde grid-cellen
// zouden uitkomen. Moet duidelijk kleiner zijn dan de cel-grootte, anders
// kan een rit een hele cel "overslaan".
const RESAMPLE_STEP_METERS = 12;

// Een enkele "sprong" tussen twee opeenvolgende GPS-punten die groter is dan
// dit (bijv. door een kort signaalverlies) wordt niet kunstmatig opgedeeld:
// dat zou een rechte lijn "verzinnen" door een stuk dat niet echt zo is
// gereden, en kan bij een grote sprong ook onnodig veel punten opleveren.
const MAX_GAP_METERS = 300;

function resamplePolyline(
  points: [number, number][],
  stepMeters: number
): [number, number][] {
  if (points.length === 0) {
    return [];
  }

  const resampled: [number, number][] = [points[0]];
  let carryoverMeters = 0;

  for (let i = 0; i < points.length - 1; i++) {
    let [lat1, lng1] = points[i];
    const [lat2, lng2] = points[i + 1];
    let segmentDistance = haversineDistanceMeters(lat1, lng1, lat2, lng2);

    if (segmentDistance > MAX_GAP_METERS) {
      resampled.push([lat2, lng2]);
      carryoverMeters = 0;
      continue;
    }

    while (segmentDistance > 0 && carryoverMeters + segmentDistance >= stepMeters) {
      const remaining = stepMeters - carryoverMeters;
      const t = remaining / segmentDistance;
      const lat = lat1 + (lat2 - lat1) * t;
      const lng = lng1 + (lng2 - lng1) * t;

      resampled.push([lat, lng]);

      segmentDistance -= remaining;
      lat1 = lat;
      lng1 = lng;
      carryoverMeters = 0;
    }

    carryoverMeters += segmentDistance;
  }

  return resampled;
}

function cellKey(point: [number, number], cellSizeDegrees: number): string {
  const [lat, lng] = point;
  const latIndex = Math.round(lat / cellSizeDegrees);
  const lngIndex = Math.round(lng / cellSizeDegrees);

  return `${latIndex}:${lngIndex}`;
}

/**
 * Herbemonstert alle meegegeven polylines en gebruikt een grid alleen om te
 * BEPALEN of een stukje weg al eerder is teruggegeven (twee ritten over
 * dezelfde straat komen op dezelfde grid-cellen uit, ook met net andere
 * GPS-samples). Aaneengesloten, nog niet eerder geziene stukken weg worden
 * samengevoegd tot één doorlopende polyline (met de echte, herbemonsterde
 * coördinaten, niet grid-middelpunten) — zo blijft de lijn net zo vloeiend
 * als op de rest van de kaart, i.p.v. uit losse hokjes opgebouwd.
 */
export function dedupeRouteSegments(
  polylines: [number, number][][],
  options?: { cellSizeDegrees?: number; resampleStepMeters?: number }
): RouteSegment[] {
  const cellSizeDegrees = options?.cellSizeDegrees ?? DEFAULT_CELL_SIZE_DEGREES;
  const resampleStepMeters = options?.resampleStepMeters ?? RESAMPLE_STEP_METERS;

  const seenEdgeKeys = new Set<string>();
  const chains: RouteSegment[] = [];

  for (const points of polylines) {
    const resampledPoints = resamplePolyline(points, resampleStepMeters);

    let currentChain: [number, number][] = [];
    let previousPoint: [number, number] | null = null;
    let previousKey: string | null = null;

    for (const point of resampledPoints) {
      const key = cellKey(point, cellSizeDegrees);

      if (previousPoint === null || previousKey === null) {
        previousPoint = point;
        previousKey = key;
        continue;
      }

      if (key === previousKey) {
        continue;
      }

      const edgeKey = previousKey < key ? `${previousKey}|${key}` : `${key}|${previousKey}`;

      if (seenEdgeKeys.has(edgeKey)) {
        if (currentChain.length >= 2) {
          chains.push(currentChain);
        }
        currentChain = [];
      } else {
        seenEdgeKeys.add(edgeKey);

        if (currentChain.length === 0) {
          currentChain.push(previousPoint);
        }

        currentChain.push(point);
      }

      previousPoint = point;
      previousKey = key;
    }

    if (currentChain.length >= 2) {
      chains.push(currentChain);
    }
  }

  return chains;
}
