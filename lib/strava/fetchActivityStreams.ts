const STREAM_KEYS = [
  "time",
  "latlng",
  "altitude",
  "velocity_smooth",
  "heartrate",
  "cadence",
  "watts",
  "moving",
];

export type ActivityStreams = {
  time?: { data: number[] };
  latlng?: { data: [number, number][] };
  altitude?: { data: number[] };
  velocity_smooth?: { data: number[] };
  heartrate?: { data: number[] };
  cadence?: { data: number[] };
  watts?: { data: number[] };
  moving?: { data: boolean[] };
};

export async function fetchActivityStreams(
  activityId: number,
  accessToken: string
): Promise<ActivityStreams | null> {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=${STREAM_KEYS.join(",")}&key_by_type=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (response.status === 404) {
    // Sommige activiteiten (bv. handmatig ingevoerd) hebben geen streams.
    return null;
  }

  if (!response.ok) {
    throw new Error(`Strava-streams ophalen mislukt (status ${response.status}).`);
  }

  return response.json();
}
