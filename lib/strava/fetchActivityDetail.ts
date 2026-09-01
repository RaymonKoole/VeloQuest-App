export async function fetchActivityDetail(
  activityId: number,
  accessToken: string
) {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Strava-activiteitdetail ophalen mislukt (status ${response.status}).`
    );
  }

  return response.json();
}
