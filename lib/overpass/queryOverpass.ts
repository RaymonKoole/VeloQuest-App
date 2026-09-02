// Overpass heeft geen officiële SLA op de gratis publieke instances; de hoofdserver
// (overpass-api.de) is in de praktijk regelmatig overbelast of tijdelijk onbereikbaar
// vanaf serverless omgevingen zoals Vercel. Probeer daarom meerdere onafhankelijke
// mirrors na elkaar voordat we de gebruiker een fout tonen.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

// Overpass-mirrors verwachten volgens hun eigen usage policy een duidelijke
// User-Agent; verzoeken zonder identificatie worden door sommige (drukbezette)
// mirrors stilzwijgend geweigerd, vooral vanaf gedeelde cloud-IP's zoals die
// van Vercel. Zonder deze header zagen we alle mirrors direct falen op
// "kon geen verbinding maken".
const USER_AGENT = "VeloQuest-App (https://veloquest-app.vercel.app)";

export async function queryOverpass(query: string, totalBudgetMs = 22000): Promise<any> {
  let lastErrorMessage = "onbekende fout";
  // Deel het totale tijdsbudget over de mirrors, i.p.v. elke mirror hetzelfde
  // vaste (korte) budget geven: de eerste, doorgaans snelste mirror krijgt zo
  // het gros van de tijd — genoeg voor een zwaardere/tragere query die wél
  // gewoon zou zijn geslaagd — en als die toch echt faalt, blijft er nog tijd
  // over voor een tweede poging elders.
  const deadline = Date.now() + totalBudgetMs;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const remainingMs = deadline - Date.now();

    if (remainingMs < 2000) {
      break;
    }

    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(remainingMs),
      });
    } catch (fetchError) {
      const isTimeout =
        fetchError instanceof Error &&
        (fetchError.name === "TimeoutError" || fetchError.name === "AbortError");

      console.error(`Overpass-fetch mislukt (${endpoint}):`, fetchError);
      lastErrorMessage = isTimeout ? "duurde te lang" : "kon geen verbinding maken";
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
