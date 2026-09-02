export type SegmentDetail = {
  id: number;
  name: string;
  distance: number;
  average_grade: number;
  maximum_grade: number;
  elevation_high: number;
  elevation_low: number;
  climb_category: number;
  city: string | null;
  state: string | null;
  country: string | null;
  athlete_count: number;
  effort_count: number;
  star_count: number;
};

export async function fetchSegmentDetail(
  segmentId: number,
  accessToken: string
): Promise<SegmentDetail | null> {
  const response = await fetch(
    `https://www.strava.com/api/v3/segments/${segmentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Strava-segmentdetail ophalen mislukt (status ${response.status}).`);
  }

  return response.json();
}
