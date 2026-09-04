import { haversineDistanceMeters } from "@/lib/routes/haversine";

export type RouteSegment = [[number, number], [number, number]];

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

function cellKeyAndCenter(
  point: [number, number],
  cellSizeDegrees: number
): { key: string; center: [number, number] } {
  const [lat, lng] = point;
  const latIndex = Math.round(lat / cellSizeDegrees);
  const lngIndex = Math.round(lng / cellSizeDegrees);

  return {
    key: `${latIndex}:${lngIndex}`,
    center: [latIndex * cellSizeDegrees, lngIndex * cellSizeDegrees],
  };
}

/**
 * Herbemonstert en snapt alle meegegeven polylines op een grid, en geeft de
 * unieke set van gereden grid-verbindingen terug: als meerdere activiteiten
 * over hetzelfde stuk weg gaan (ook met net andere GPS-samples), komen ze op
 * dezelfde grid-cellen uit en wordt dat stuk maar één keer teruggegeven.
 */
export function dedupeRouteSegments(
  polylines: [number, number][][],
  options?: { cellSizeDegrees?: number; resampleStepMeters?: number }
): RouteSegment[] {
  const cellSizeDegrees = options?.cellSizeDegrees ?? DEFAULT_CELL_SIZE_DEGREES;
  const resampleStepMeters = options?.resampleStepMeters ?? RESAMPLE_STEP_METERS;

  const seenEdgeKeys = new Set<string>();
  const segments: RouteSegment[] = [];

  for (const points of polylines) {
    const resampledPoints = resamplePolyline(points, resampleStepMeters);

    let previousCell: { key: string; center: [number, number] } | null = null;

    for (const point of resampledPoints) {
      const cell = cellKeyAndCenter(point, cellSizeDegrees);

      if (previousCell && previousCell.key !== cell.key) {
        const edgeKey =
          previousCell.key < cell.key
            ? `${previousCell.key}|${cell.key}`
            : `${cell.key}|${previousCell.key}`;

        if (!seenEdgeKeys.has(edgeKey)) {
          seenEdgeKeys.add(edgeKey);
          segments.push([previousCell.center, cell.center]);
        }
      }

      previousCell = cell;
    }
  }

  return segments;
}
