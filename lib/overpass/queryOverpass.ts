// Overpass heeft geen officiële SLA op de gratis publieke instances; de hoofdserver
// (overpass-api.de) is in de praktijk regelmatig overbelast of tijdelijk onbereikbaar
// vanaf serverless omgevingen zoals Vercel. Probeer daarom meerdere onafhankelijke
// mirrors na elkaar voordat we de gebruiker een fout tonen.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

export async function queryOverpass(query: string, timeoutMs = 20000): Promise<any> {
  let lastErrorMessage = "onbekende fout";

  for (const endpoint of OVERPASS_ENDPOINTS) {
    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (fetchError) {
      console.error(`Overpass-fetch mislukt (${endpoint}):`, fetchError);
      lastErrorMessage = "kon geen verbinding maken";
      continue;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`Overpass gaf foutstatus (${endpoint}):`, response.status, body.slice(0, 500));
      lastErrorMessage = `foutstatus ${response.status}`;
      continue;
    }

    try {
      return await response.json();
    } catch (parseError) {
      console.error(`Overpass gaf geen geldige JSON terug (${endpoint}):`, parseError);
      lastErrorMessage = "ongeldig antwoord";
      continue;
    }
  }

  throw new Error(
    `De OpenStreetMap-wegendata (Overpass) is momenteel niet bereikbaar (${lastErrorMessage}). Probeer het straks opnieuw.`
  );
}
