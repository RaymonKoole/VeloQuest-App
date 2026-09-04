// Groepeert activiteiten die (nagenoeg) dezelfde route hebben gereden, zodat
// de kaart bijv. 4 ritten over dezelfde weg als 1 lijn kan tonen. Vergelijkt
// niet alleen het startpunt (zoals de bestaande marker-clustering), maar de
// hele gereden route: elk punt wordt gesnapt op een grid-cel, en twee routes
// worden als "hetzelfde" gezien als hun grid-cellen voldoende overlappen
// (Jaccard-similariteit).
const DEFAULT_CELL_SIZE_DEGREES = 0.0005; // ~40-55m in Nederland
const DEFAULT_SIMILARITY_THRESHOLD = 0.6;

function cellsForPoints(
  points: [number, number][],
  cellSizeDegrees: number
): Set<string> {
  const cells = new Set<string>();

  for (const [lat, lng] of points) {
    const key = `${Math.round(lat / cellSizeDegrees)}:${Math.round(lng / cellSizeDegrees)}`;
    cells.add(key);
  }

  return cells;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;

  for (const cell of smaller) {
    if (larger.has(cell)) {
      intersection += 1;
    }
  }

  return intersection / (a.size + b.size - intersection);
}

/**
 * Retourneert een Map van representatieve activity-id -> alle activity-ids
 * (inclusief zichzelf) die als dezelfde route worden beschouwd.
 */
export function groupSimilarRoutes(
  activityIds: number[],
  polylinesById: Map<number, [number, number][]>,
  options?: { cellSizeDegrees?: number; similarityThreshold?: number }
): Map<number, number[]> {
  const cellSizeDegrees = options?.cellSizeDegrees ?? DEFAULT_CELL_SIZE_DEGREES;
  const similarityThreshold =
    options?.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;

  const groups: {
    representativeId: number;
    cells: Set<string>;
    memberIds: number[];
  }[] = [];

  for (const activityId of activityIds) {
    const points = polylinesById.get(activityId);

    if (!points || points.length < 2) {
      continue;
    }

    const cells = cellsForPoints(points, cellSizeDegrees);
    const match = groups.find(
      (group) => jaccardSimilarity(group.cells, cells) >= similarityThreshold
    );

    if (match) {
      match.memberIds.push(activityId);
    } else {
      groups.push({ representativeId: activityId, cells, memberIds: [activityId] });
    }
  }

  const result = new Map<number, number[]>();

  for (const group of groups) {
    result.set(group.representativeId, group.memberIds);
  }

  return result;
}
