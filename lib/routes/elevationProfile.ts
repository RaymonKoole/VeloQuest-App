import { haversineDistanceMeters } from "@/lib/routes/haversine";

export type ElevationPoint = { distanceKm: number; elevationM: number };

const MAX_PROFILE_POINTS = 300;

/**
 * Strava's activity-streams bevatten geen losse "afstand"-stream in onze
 * selectie; de cumulatieve afstand wordt hier berekend uit de latlng-stream
 * (haversine tussen opeenvolgende punten), gekoppeld aan de altitude-stream.
 */
export function buildElevationProfile(
  altitude: number[] | null | undefined,
  latlng: [number, number][] | null | undefined
): ElevationPoint[] {
  if (!altitude || altitude.length === 0 || !latlng || latlng.length === 0) {
    return [];
  }

  const raw: ElevationPoint[] = [{ distanceKm: 0, elevationM: altitude[0] }];
  let cumulativeM = 0;

  for (let i = 1; i < altitude.length; i++) {
    const prevPoint = latlng[i - 1];
    const point = latlng[i];

    if (prevPoint && point) {
      cumulativeM += haversineDistanceMeters(prevPoint[0], prevPoint[1], point[0], point[1]);
    }

    raw.push({ distanceKm: cumulativeM / 1000, elevationM: altitude[i] });
  }

  if (raw.length <= MAX_PROFILE_POINTS) {
    return raw;
  }

  // Downsamplen voor een vloeiendere/lichtere grafiek bij lange ritten, met
  // behoud van het laatste punt zodat de totale afstand klopt.
  const stride = Math.ceil(raw.length / MAX_PROFILE_POINTS);

  return raw.filter((_, index) => index % stride === 0 || index === raw.length - 1);
}
