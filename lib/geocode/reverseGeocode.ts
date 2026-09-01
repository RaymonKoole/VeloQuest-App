export async function reverseGeocode(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "VeloQuest-App (https://veloquest-app.vercel.app)",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    return { city: null, country: null };
  }

  const data = await response.json();
  const address = data.address || {};

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    null;

  const country = address.country || null;

  return { city, country };
}
