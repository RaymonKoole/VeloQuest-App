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

/** Compact binary min-heap keyed by distance, used by shortestPath(). */
class MinHeap {
  private items: [number, number][] = [];

  push(distance: number, nodeId: number) {
    this.items.push([distance, nodeId]);
    let index = this.items.length - 1;

    while (index > 0) {
      const parent = (index - 1) >> 1;

      if (this.items[parent][0] <= this.items[index][0]) {
        break;
      }

      [this.items[parent], this.items[index]] = [
        this.items[index],
        this.items[parent],
      ];
      index = parent;
    }
  }

  pop(): [number, number] | undefined {
    if (this.items.length === 0) {
      return undefined;
    }

    const top = this.items[0];
    const last = this.items.pop()!;

    if (this.items.length > 0) {
      this.items[0] = last;
      let index = 0;

      while (true) {
        const left = index * 2 + 1;
        const right = index * 2 + 2;
        let smallest = index;

        if (left < this.items.length && this.items[left][0] < this.items[smallest][0]) {
          smallest = left;
        }

        if (right < this.items.length && this.items[right][0] < this.items[smallest][0]) {
          smallest = right;
        }

        if (smallest === index) {
          break;
        }

        [this.items[smallest], this.items[index]] = [
          this.items[index],
          this.items[smallest],
        ];
        index = smallest;
      }
    }

    return top;
  }

  get size() {
    return this.items.length;
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
  const heap = new MinHeap();

  dist.set(fromId, 0);
  heap.push(0, fromId);

  while (heap.size > 0) {
    const [d, currentId] = heap.pop()!;

    if (visited.has(currentId)) {
      continue;
    }

    if (d > (dist.get(currentId) ?? Infinity)) {
      continue;
    }

    visited.add(currentId);

    if (currentId === toId) {
      break;
    }

    const edges = graph.adjacency.get(currentId) || [];

    for (const edge of edges) {
      if (visited.has(edge.to)) {
        continue;
      }

      const newDist = d + edge.distanceM;

      if (newDist < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, newDist);
        prev.set(edge.to, currentId);
        heap.push(newDist, edge.to);
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

function bearingDegrees(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** 1 when bearings match exactly, -1 when opposite. */
function bearingAlignment(bearingDeg: number, targetBearingDeg: number) {
  const diff = Math.abs(bearingDeg - targetBearingDeg) % 360;
  const angleDiff = diff > 180 ? 360 - diff : diff;

  return Math.cos((angleDiff * Math.PI) / 180);
}

export type GenerateRouteOptions = {
  /** Higher = more strongly prefers roads not yet ridden. Default 400. */
  noveltyWeight?: number;
  /** Compass bearing (0-360, 0 = north) to head towards during the outbound leg. */
  targetBearingDeg?: number;
};

export function generateLoopRoute(
  graph: RoadGraph,
  startNodeId: number,
  targetDistanceM: number,
  options: GenerateRouteOptions = {}
) {
  const noveltyWeight = options.noveltyWeight ?? 400;
  const targetBearingDeg = options.targetBearingDeg;

  const path: number[] = [startNodeId];
  let current = startNodeId;
  let traveled = 0;

  const usedEdgeCount = new Map<string, number>();
  const maxSteps = 3000;
  let stepsSinceClosingAttempt = 0;

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
    const fromNode = graph.nodes.get(current);

    const scored = neighbors.map((edge) => {
      const edgeKey = `${current}-${edge.to}`;
      const timesUsed = usedEdgeCount.get(edgeKey) || 0;
      const noveltyBonus = edge.ridden ? 0 : noveltyWeight;
      const repeatPenalty = timesUsed * 600;
      const distStart = distanceToStart(edge.to);
      const homeBias =
        progress > 0.55 ? -distStart * (progress - 0.5) * 2 : 0;

      let directionBonus = 0;

      if (targetBearingDeg !== undefined && progress < 0.5 && fromNode) {
        const toNode = graph.nodes.get(edge.to);

        if (toNode) {
          const bearing = bearingDegrees(
            fromNode.lat,
            fromNode.lng,
            toNode.lat,
            toNode.lng
          );

          directionBonus = bearingAlignment(bearing, targetBearingDeg) * 350;
        }
      }

      const randomness = Math.random() * 250;

      return {
        edge,
        score:
          noveltyBonus +
          homeBias +
          directionBonus +
          randomness -
          repeatPenalty,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const chosen = scored[0].edge;

    const edgeKey = `${current}-${chosen.to}`;
    usedEdgeCount.set(edgeKey, (usedEdgeCount.get(edgeKey) || 0) + 1);

    path.push(chosen.to);
    traveled += chosen.distanceM;
    current = chosen.to;
    stepsSinceClosingAttempt++;

    // Only attempt the (relatively expensive) closing shortest-path every few
    // steps once we're in range, instead of on every single step.
    if (traveled > targetDistanceM * 0.9 && stepsSinceClosingAttempt >= 3) {
      stepsSinceClosingAttempt = 0;
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
