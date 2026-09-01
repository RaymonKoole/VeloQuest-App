import { haversineDistanceMeters } from "@/lib/routes/haversine";

const POI_TYPES = ["cafe", "restaurant", "fast_food", "bar", "pub"].join("|");

export async function findNearbyPoi(
  lat: number,
  lng: number,
  radiusMeters = 60
) {
  const query = `[out:json][timeout:15];(node["amenity"~"^(${POI_TYPES})$"](around:${radiusMeters},${lat},${lng}););out body;`;

  let response: Response;

  try {
    response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(15000),
    });
  } catch (fetchError) {
    console.error("Overpass POI-lookup fetch mislukt:", fetchError);
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let data: any;

  try {
    data = await response.json();
  } catch (parseError) {
    console.error("Overpass POI-lookup gaf geen geldige JSON terug:", parseError);
    return null;
  }

  const nodes = (data.elements || []).filter(
    (element: any) => element.type === "node" && element.tags?.name
  );

  if (nodes.length === 0) {
    return null;
  }

  let closest = nodes[0];
  let closestDistance = haversineDistanceMeters(lat, lng, closest.lat, closest.lon);

  for (const node of nodes.slice(1)) {
    const distance = haversineDistanceMeters(lat, lng, node.lat, node.lon);

    if (distance < closestDistance) {
      closest = node;
      closestDistance = distance;
    }
  }

  return {
    name: closest.tags.name as string,
    type: closest.tags.amenity as string,
  };
}
