export type DetectedStop = {
  lat: number;
  lng: number;
  durationSeconds: number;
};

/**
 * Vindt periodes waarin de fietser langere tijd stilstond of nauwelijks
 * bewoog, op basis van de Strava-streams van een activiteit.
 */
export function detectStops(
  streams: {
    time: number[];
    latlng: [number, number][];
    velocitySmooth?: number[];
    moving?: boolean[];
  },
  minStopSeconds = 120,
  maxSpeedMs = 0.5
): DetectedStop[] {
  const { time, latlng, velocitySmooth, moving } = streams;

  if (!time || !latlng || time.length === 0 || latlng.length !== time.length) {
    return [];
  }

  const stops: DetectedStop[] = [];
  let stopStartIndex: number | null = null;

  function isStoppedAt(i: number) {
    if (moving) {
      return moving[i] === false;
    }

    if (velocitySmooth) {
      return velocitySmooth[i] <= maxSpeedMs;
    }

    return false;
  }

  function pushStopIfLongEnough(startIndex: number, endIndex: number) {
    const duration = time[endIndex] - time[startIndex];

    if (duration >= minStopSeconds) {
      const midIndex = Math.floor((startIndex + endIndex) / 2);
      const [lat, lng] = latlng[midIndex];

      stops.push({ lat, lng, durationSeconds: Math.round(duration) });
    }
  }

  for (let i = 0; i < time.length; i++) {
    const stopped = isStoppedAt(i);

    if (stopped && stopStartIndex === null) {
      stopStartIndex = i;
    } else if (!stopped && stopStartIndex !== null) {
      pushStopIfLongEnough(stopStartIndex, i - 1);
      stopStartIndex = null;
    }
  }

  if (stopStartIndex !== null) {
    pushStopIfLongEnough(stopStartIndex, time.length - 1);
  }

  return stops;
}
