import { haversineDistanceMeters } from "@/lib/routes/haversine";
import type { RoadGraph } from "@/lib/routes/osmGraph";

const BUCKET_SIZE_DEG = 0.0005; // ~50m
const RIDDEN_THRESHOLD_M = 25;

function bucketKey(lat: number, lng: number) {
  return `${Math.floor(lat / BUCKET_SIZE_DEG)}:${Math.floor(lng / BUCKET_SIZE_DEG)}`;
}

/**
 * Strava's summary polyline is simplified and can have long, sparse gaps between
 * points on straight stretches. Interpolate extra points along each segment so
 * ridden-road detection doesn't miss straight sections between distant vertices.
 */
export function densifyPoints(
  points: [number, number][],
  maxGapMeters = 15
): [number, number][] {
  const result: [number, number][] = [];

  for (let i = 0; i < points.length; i++) {
    result.push(points[i]);

    if (i < points.length - 1) {
      const [lat1, lng1] = points[i];
      const [lat2, lng2] = points[i + 1];
      const segmentDistance = haversineDistanceMeters(lat1, lng1, lat2, lng2);

      if (segmentDistance > maxGapMeters) {
        const steps = Math.ceil(segmentDistance / maxGapMeters);

        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          result.push([lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t]);
        }
      }
    }
  }

  return result;
}

export function markRiddenEdges(
  graph: RoadGraph,
  riddenPoints: { lat: number; lng: number }[]
) {
  const grid = new Map<string, { lat: number; lng: number }[]>();

  for (const point of riddenPoints) {
    const key = bucketKey(point.lat, point.lng);
    const bucket = grid.get(key);

    if (bucket) {
      bucket.push(point);
    } else {
      grid.set(key, [point]);
    }
  }

  function isNearRidden(lat: number, lng: number) {
    const baseLatIdx = Math.floor(lat / BUCKET_SIZE_DEG);
    const baseLngIdx = Math.floor(lng / BUCKET_SIZE_DEG);

    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLng = -1; dLng <= 1; dLng++) {
        const bucket = grid.get(`${baseLatIdx + dLat}:${baseLngIdx + dLng}`);

        if (!bucket) {
          continue;
        }

        for (const point of bucket) {
          if (
            haversineDistanceMeters(lat, lng, point.lat, point.lng) <=
            RIDDEN_THRESHOLD_M
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  for (const [fromId, edges] of graph.adjacency.entries()) {
    const fromNode = graph.nodes.get(fromId);

    if (!fromNode) {
      continue;
    }

    for (const edge of edges) {
      const toNode = graph.nodes.get(edge.to);

      if (!toNode) {
        continue;
      }

      const midLat = (fromNode.lat + toNode.lat) / 2;
      const midLng = (fromNode.lng + toNode.lng) / 2;

      edge.ridden = isNearRidden(midLat, midLng);
    }
  }
}

export function shortestPath(
  graph: RoadGraph,
  fromId: number,
  toId: number
): number[] | null {
  const dist = new Map<number, number>();
  const prev = new Map<number, number>();
  const visited = new Set<number>();

  dist.set(fromId, 0);

  while (true) {
    let currentId: number | null = null;
    let currentDist = Infinity;

    for (const [id, d] of dist.entries()) {
      if (!visited.has(id) && d < currentDist) {
        currentDist = d;
        currentId = id;
      }
    }

    if (currentId === null || currentId === toId) {
      break;
    }

    visited.add(currentId);

    const edges = graph.adjacency.get(currentId) || [];

    for (const edge of edges) {
      if (visited.has(edge.to)) {
        continue;
      }

      const newDist = currentDist + edge.distanceM;

      if (newDist < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, newDist);
        prev.set(edge.to, currentId);
      }
    }
  }

  if (!dist.has(toId)) {
    return null;
  }

  const path: number[] = [toId];
  let cur = toId;

  while (cur !== fromId) {
    const p = prev.get(cur);

    if (p === undefined) {
      return null;
    }

    path.push(p);
    cur = p;
  }

  return path.reverse();
}

function pathDistanceM(graph: RoadGraph, path: number[]) {
  let distance = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const a = graph.nodes.get(path[i]);
    const b = graph.nodes.get(path[i + 1]);

    if (!a || !b) {
      continue;
    }

    distance += haversineDistanceMeters(a.lat, a.lng, b.lat, b.lng);
  }

  return distance;
}

export function generateLoopRoute(
  graph: RoadGraph,
  startNodeId: number,
  targetDistanceM: number
) {
  const path: number[] = [startNodeId];
  let current = startNodeId;
  let traveled = 0;

  const usedEdgeCount = new Map<string, number>();
  const maxSteps = 3000;

  const start = graph.nodes.get(startNodeId);

  function distanceToStart(nodeId: number) {
    const node = graph.nodes.get(nodeId);

    if (!node || !start) {
      return Infinity;
    }

    return haversineDistanceMeters(node.lat, node.lng, start.lat, start.lng);
  }

  for (let step = 0; step < maxSteps; step++) {
    const remaining = targetDistanceM - traveled;

    if (remaining <= 200) {
      break;
    }

    const neighbors = (graph.adjacency.get(current) || []).filter(
      (edge) => edge.to !== current
    );

    if (neighbors.length === 0) {
      break;
    }

    const progress = traveled / targetDistanceM;

    const scored = neighbors.map((edge) => {
      const edgeKey = `${current}-${edge.to}`;
      const timesUsed = usedEdgeCount.get(edgeKey) || 0;
      const noveltyBonus = edge.ridden ? 0 : 400;
      const repeatPenalty = timesUsed * 600;
      const distStart = distanceToStart(edge.to);
      const homeBias =
        progress > 0.55 ? -distStart * (progress - 0.5) * 2 : 0;
      const randomness = Math.random() * 250;

      return {
        edge,
        score: noveltyBonus + homeBias + randomness - repeatPenalty,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const chosen = scored[0].edge;

    const edgeKey = `${current}-${chosen.to}`;
    usedEdgeCount.set(edgeKey, (usedEdgeCount.get(edgeKey) || 0) + 1);

    path.push(chosen.to);
    traveled += chosen.distanceM;
    current = chosen.to;

    if (traveled > targetDistanceM * 0.65) {
      const distStart = distanceToStart(current);

      if (distStart < targetDistanceM - traveled) {
        const closingPath = shortestPath(graph, current, startNodeId);

        if (closingPath && closingPath.length > 1) {
          const closingDistance = pathDistanceM(graph, closingPath);

          if (traveled + closingDistance <= targetDistanceM * 1.2) {
            path.push(...closingPath.slice(1));
            traveled += closingDistance;
            current = startNodeId;
            break;
          }
        }
      }
    }
  }

  if (current !== startNodeId) {
    const closingPath = shortestPath(graph, current, startNodeId);

    if (closingPath && closingPath.length > 1) {
      path.push(...closingPath.slice(1));
      traveled += pathDistanceM(graph, closingPath);
    }
  }

  let riddenM = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const edges = graph.adjacency.get(path[i]) || [];
    const edge = edges.find((e) => e.to === path[i + 1]);

    if (edge?.ridden) {
      riddenM += edge.distanceM;
    }
  }

  const points = path
    .map((nodeId) => graph.nodes.get(nodeId))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
    .map((node) => [node.lat, node.lng] as [number, number]);

  return {
    points,
    distanceM: traveled,
    riddenM,
    newM: Math.max(0, traveled - riddenM),
  };
}
