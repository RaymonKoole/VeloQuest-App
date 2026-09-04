export type RouteSegment = [[number, number], [number, number]];

// Rondt GPS-punten af op een grid-cel zodat kleine GPS-afwijkingen tussen
// ritten over dezelfde weg niet als een ander stukje weg worden gezien.
const DEFAULT_CELL_SIZE_DEGREES = 0.0005; // ~40-55m in Nederland

function cellKey(point: [number, number], cellSizeDegrees: number): string {
  const [lat, lng] = point;
  return `${Math.round(lat / cellSizeDegrees)}:${Math.round(lng / cellSizeDegrees)}`;
}

/**
 * Knipt alle meegegeven polylines op in kleine stukjes weg (segmenten tussen
 * opeenvolgende GPS-punten) en geeft de unieke set van die stukjes terug:
 * als meerdere activiteiten over hetzelfde stuk weg gaan, wordt dat stuk
 * maar één keer teruggegeven, ongeacht hoeveel activiteiten erover gingen.
 */
export function dedupeRouteSegments(
  polylines: [number, number][][],
  options?: { cellSizeDegrees?: number }
): RouteSegment[] {
  const cellSizeDegrees = options?.cellSizeDegrees ?? DEFAULT_CELL_SIZE_DEGREES;
  const seenEdgeKeys = new Set<string>();
  const segments: RouteSegment[] = [];

  for (const points of polylines) {
    for (let i = 0; i < points.length - 1; i++) {
      const pointA = points[i];
      const pointB = points[i + 1];

      const cellA = cellKey(pointA, cellSizeDegrees);
      const cellB = cellKey(pointB, cellSizeDegrees);

      if (cellA === cellB) {
        continue;
      }

      const edgeKey = cellA < cellB ? `${cellA}|${cellB}` : `${cellB}|${cellA}`;

      if (seenEdgeKeys.has(edgeKey)) {
        continue;
      }

      seenEdgeKeys.add(edgeKey);
      segments.push([pointA, pointB]);
    }
  }

  return segments;
}
