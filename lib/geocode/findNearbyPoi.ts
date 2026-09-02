import { haversineDistanceMeters } from "@/lib/routes/haversine";
import { queryOverpass } from "@/lib/overpass/queryOverpass";

const POI_TYPES = ["cafe", "restaurant", "fast_food", "bar", "pub"].join("|");

export async function findNearbyPoi(
  lat: number,
  lng: number,
  radiusMeters = 60
) {
  const query = `[out:json][timeout:15];(node["amenity"~"^(${POI_TYPES})$"](around:${radiusMeters},${lat},${lng}););out body;`;

  // Laat een Overpass-storing hier bewust doorgooien (i.p.v. null teruggeven)
  // zodat de aanroeper kan onderscheiden tussen "geen café gevonden" en
  // "Overpass is niet bereikbaar" — bij dat laatste kan de aanroeper stoppen
  // met verdere pogingen i.p.v. het tijdsbudget te verspillen.
  const data = await queryOverpass(query, 6000);

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
