import { haversineDistanceMeters } from "@/lib/routes/haversine";

export type GraphNode = {
  id: number;
  lat: number;
  lng: number;
};

export type GraphEdge = {
  to: number;
  distanceM: number;
  ridden: boolean;
};

export type RoadGraph = {
  nodes: Map<number, GraphNode>;
  adjacency: Map<number, GraphEdge[]>;
};

const BIKE_HIGHWAY_TYPES = [
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
  "tertiary",
  "tertiary_link",
  "unclassified",
  "residential",
  "living_street",
  "service",
  "track",
  "path",
  "cycleway",
].join("|");

function addEdge(
  adjacency: Map<number, GraphEdge[]>,
  from: number,
  to: number,
  distanceM: number
) {
  const existing = adjacency.get(from);

  if (existing) {
    existing.push({ to, distanceM, ridden: false });
  } else {
    adjacency.set(from, [{ to, distanceM, ridden: false }]);
  }
}

export async function fetchRoadGraph(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<RoadGraph> {
  const query = `
[out:json][timeout:25];
(
  way["highway"~"^(${BIKE_HIGHWAY_TYPES})$"](around:${radiusMeters},${lat},${lng});
);
out body;
>;
out skel qt;
`;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error("Overpass-query mislukt.");
  }

  const data = await response.json();

  const nodes = new Map<number, GraphNode>();
  const adjacency = new Map<number, GraphEdge[]>();

  for (const element of data.elements || []) {
    if (element.type === "node") {
      nodes.set(element.id, {
        id: element.id,
        lat: element.lat,
        lng: element.lon,
      });
    }
  }

  for (const element of data.elements || []) {
    if (element.type !== "way" || !Array.isArray(element.nodes)) {
      continue;
    }

    const oneway = element.tags?.oneway === "yes";
    const wayNodes: number[] = element.nodes;

    for (let i = 0; i < wayNodes.length - 1; i++) {
      const fromNode = nodes.get(wayNodes[i]);
      const toNode = nodes.get(wayNodes[i + 1]);

      if (!fromNode || !toNode) {
        continue;
      }

      const distanceM = haversineDistanceMeters(
        fromNode.lat,
        fromNode.lng,
        toNode.lat,
        toNode.lng
      );

      addEdge(adjacency, fromNode.id, toNode.id, distanceM);

      if (!oneway) {
        addEdge(adjacency, toNode.id, fromNode.id, distanceM);
      }
    }
  }

  return { nodes, adjacency };
}

export function nearestNode(graph: RoadGraph, lat: number, lng: number) {
  let closest: GraphNode | null = null;
  let closestDistance = Infinity;

  for (const node of graph.nodes.values()) {
    const distance = haversineDistanceMeters(lat, lng, node.lat, node.lng);

    if (distance < closestDistance) {
      closestDistance = distance;
      closest = node;
    }
  }

  return closest;
}
