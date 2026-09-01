export async function forwardGeocode(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
    query
  )}`;

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "VeloQuest-App (https://veloquest-app.vercel.app)",
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch (fetchError) {
    console.error("Nominatim geocode fetch mislukt:", fetchError);
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let results: any;

  try {
    results = await response.json();
  } catch (parseError) {
    console.error("Nominatim gaf geen geldige JSON terug:", parseError);
    return null;
  }

  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    displayName: results[0].display_name as string,
  };
}
