export async function fetchActivityPhotos(
  activityId: number,
  accessToken: string
): Promise<string[]> {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/photos?photo_sources=true&size=600`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Strava-foto's ophalen mislukt (status ${response.status}).`
    );
  }

  const photos = await response.json();

  if (!Array.isArray(photos)) {
    return [];
  }

  return photos
    .map((photo: any) => {
      const urls = photo?.urls;

      if (!urls) {
        return null;
      }

      return urls["600"] || Object.values(urls)[0] || null;
    })
    .filter((url): url is string => Boolean(url));
}
