import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateActivityXp } from "@/lib/xp/calculate";
import { checkBadges } from "@/lib/badges/checkBadges";
import { calculateSkills } from "@/lib/skills/calculateSkills";
import { calculateQuests } from "@/lib/quests/calculateQuests";
import { getValidStravaAccessToken } from "@/lib/strava/getAccessToken";
import { fetchActivityDetail } from "@/lib/strava/fetchActivityDetail";
import { fetchActivityStreams } from "@/lib/strava/fetchActivityStreams";

// Bij een eerste sync na deze update kan de "hele rithistorie" als nieuw gelden.
// Verwerk daarom per sync-aanroep maar een beperkt aantal ritten met extra
// Strava-aanroepen (detail + streams), de rest volgt geleidelijk bij volgende syncs.
const MAX_ENRICH_PER_SYNC = 15;
const ENRICH_DELAY_MS = 300;

// Vercel kapt de functie hard af na maxDuration (30s) en geeft dan geen JSON
// terug maar een platform-foutpagina, wat bij de gebruiker als een cryptische
// "Verrijken is niet gelukt" landt. Stop daarom zelf ruim op tijd met nieuwe
// werk oppakken, zodat er altijd een geldige JSON-respons terugkomt — de rest
// volgt gewoon bij de volgende sync (al opgeslagen ritten worden niet
// opnieuw verwerkt).
const SYNC_TIME_BUDGET_MS = 20000;

export const maxDuration = 30;
export async function POST(request: NextRequest) {
  const syncStartedAt = Date.now();

  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Geen Supabase-sessie ontvangen." },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Ongeldige Supabase-sessie." },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let stravaAccessToken: string | null;

    try {
      stravaAccessToken = await getValidStravaAccessToken(user.id);
    } catch (tokenError) {
      console.error("Strava account error:", tokenError);

      return NextResponse.json(
        { error: "Strava-account kon niet worden gevonden." },
        { status: 500 }
      );
    }

    if (!stravaAccessToken) {
      return NextResponse.json(
        { error: "Geen Strava-account gekoppeld." },
        { status: 404 }
      );
    }

    const allActivities: any[] = [];
    let page = 1;

    while (true) {
      if (Date.now() - syncStartedAt > SYNC_TIME_BUDGET_MS) {
        console.warn(
          `Activiteitenlijst ophalen afgebroken wegens tijdslimiet op pagina ${page}`
        );
        break;
      }

      const response = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${stravaAccessToken}`,
          },
        }
      );

      const activities = await response.json();

      if (!response.ok) {
        console.error("Strava activities error:", response.status, activities);

        let message = "Strava-activiteiten konden niet worden opgehaald.";

        if (response.status === 429) {
          message =
            "Strava heeft tijdelijk een limiet bereikt op het aantal aanvragen (dit gebeurt sneller dan je zou denken, elke sync doet best veel Strava-aanroepen). Probeer het over een kwartier opnieuw.";
        } else if (response.status === 401) {
          message =
            "De Strava-koppeling lijkt niet meer geldig. Koppel Strava opnieuw via het dashboard.";
        }

        return NextResponse.json({ error: message }, { status: response.status });
      }

      if (!Array.isArray(activities) || activities.length === 0) {
        break;
      }

      allActivities.push(...activities);

      if (activities.length < 100) {
        break;
      }

      page++;
    }

    const rows = allActivities.map((activity) => ({
      user_id: user.id,
      strava_activity_id: activity.id,
      name: activity.name ?? null,
      activity_type: activity.type ?? null,
      distance: activity.distance ?? null,
      moving_time: activity.moving_time ?? null,
      elapsed_time: activity.elapsed_time ?? null,
      total_elevation_gain: activity.total_elevation_gain ?? null,
      start_date: activity.start_date ?? null,
      average_speed: activity.average_speed ?? null,
      max_speed: activity.max_speed ?? null,
      start_lat: activity.start_latlng?.[0] ?? null,
      start_lng: activity.start_latlng?.[1] ?? null,
      summary_polyline: activity.map?.summary_polyline ?? null,
    }));

    let enrichedThisSync = 0;
    let remainingToEnrich = 0;
    let enrichFailedThisSync = 0;

    if (rows.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("strava_activities")
        .upsert(rows, {
          onConflict: "user_id,strava_activity_id",
        });
const cyclingActivities = rows.filter(
  (activity) =>
    activity.activity_type === "Ride" ||
    activity.activity_type === "GravelRide"
);

const savedActivities: { dbId: number; stravaActivityId: number }[] = [];

for (const activity of cyclingActivities) {
  const xp = calculateActivityXp(activity);

  const { data: savedActivity, error: activityError } =
    await supabaseAdmin
      .from("strava_activities")
      .select("id")
      .eq("user_id", user.id)
      .eq("strava_activity_id", activity.strava_activity_id)
      .single();

  if (activityError || !savedActivity) {
    console.error(
      "Strava activity ID kon niet worden gevonden:",
      activityError
    );
    continue;
  }

  const { error: xpError } = await supabaseAdmin
    .from("activity_xp")
    .upsert(
      {
        user_id: user.id,
        activity_id: savedActivity.id,
        distance_xp: xp.distanceXp,
        elevation_xp: xp.elevationXp,
        bonus_xp: xp.bonusXp,
        total_xp: xp.totalXp,
      },
      {
        onConflict: "activity_id",
      }
    );

  if (xpError) {
    console.error(
      `XP kon niet worden opgeslagen voor activiteit ${savedActivity.id}:`,
      xpError
    );
  }

  savedActivities.push({
    dbId: savedActivity.id,
    stravaActivityId: activity.strava_activity_id,
  });
}

// Bepaal welke ritten nog verrijkt moeten worden (streams/segments/kudos):
// gebaseerd op het ontbreken van een activity_streams-rij, niet op "nieuw
// t.o.v. de vorige sync". Zo blijven oude ritten in de wachtrij staan totdat
// ze daadwerkelijk verrijkt zijn, in plaats van na één sync permanent
// overgeslagen te worden.
const savedDbIds = savedActivities.map((activity) => activity.dbId);

const { data: enrichedStreamRows } =
  savedDbIds.length > 0
    ? await supabaseAdmin
        .from("activity_streams")
        .select("activity_id")
        .in("activity_id", savedDbIds)
    : { data: [] as { activity_id: number }[] };

const enrichedDbIds = new Set(
  (enrichedStreamRows || []).map((row) => row.activity_id)
);

const needsEnrichment = savedActivities.filter(
  (activity) => !enrichedDbIds.has(activity.dbId)
);

let attemptedCount = 0;

// Verrijk per sync-aanroep maar een beperkt aantal ritten met extra
// Strava-aanroepen (detail + streams) — voorkomt een piek aan aanvragen
// bij gebruikers met een grote bestaande rithistorie. De rest volgt bij
// volgende syncs, inclusief oude ritten. Stop ook vroegtijdig als het
// tijdsbudget van deze aanroep bijna op is.
for (const { dbId, stravaActivityId } of needsEnrichment) {
  if (attemptedCount >= MAX_ENRICH_PER_SYNC) {
    break;
  }

  if (Date.now() - syncStartedAt > SYNC_TIME_BUDGET_MS) {
    console.warn(
      `Verrijken afgebroken wegens tijdslimiet na ${attemptedCount} ritten`
    );
    break;
  }

  try {
    const detail = await fetchActivityDetail(stravaActivityId, stravaAccessToken);

    const { error: detailUpdateError } = await supabaseAdmin
      .from("strava_activities")
      .update({
        kudos_count: detail.kudos_count ?? null,
        calories: detail.calories ?? null,
      })
      .eq("id", dbId);

    if (detailUpdateError) {
      console.error(
        `Opslaan van activiteitdetail mislukt voor rit ${dbId} (Strava-id ${stravaActivityId}):`,
        detailUpdateError
      );
    }

    if (Array.isArray(detail.segment_efforts) && detail.segment_efforts.length > 0) {
      const effortRows = detail.segment_efforts
        .filter((effort: any) => effort.segment?.id)
        .map((effort: any) => ({
          activity_id: dbId,
          user_id: user.id,
          segment_id: effort.segment.id,
          segment_name: effort.segment?.name ?? null,
          elapsed_time: effort.elapsed_time ?? null,
          pr_rank: effort.pr_rank ?? null,
          kom_rank: effort.kom_rank ?? null,
        }));

      if (effortRows.length > 0) {
        const { error: effortsError } = await supabaseAdmin
          .from("activity_segment_efforts")
          .upsert(effortRows, { onConflict: "activity_id,segment_id" });

        if (effortsError) {
          console.error(
            `Opslaan van segment-efforts mislukt voor rit ${dbId} (Strava-id ${stravaActivityId}):`,
            effortsError
          );
        }
      }
    }
  } catch (detailError) {
    console.error(
      `Activiteitdetail ophalen mislukt voor ${stravaActivityId}:`,
      detailError
    );
  }

  try {
    const streams = await fetchActivityStreams(stravaActivityId, stravaAccessToken);

    // Ook wanneer Strava geen streams heeft voor deze activiteit (streams is
    // dan null, bv. handmatig ingevoerde ritten) slaan we een (lege) rij op.
    // Zo telt deze activiteit als "verwerkt" en komt hij niet iedere sync
    // opnieuw in de wachtrij terecht, wat anders ten koste zou gaan van de
    // ritten die nog wél echt verrijkt moeten worden.
    const { error: streamsUpsertError } = await supabaseAdmin
      .from("activity_streams")
      .upsert(
        {
          activity_id: dbId,
          user_id: user.id,
          time: streams?.time?.data ?? null,
          latlng: streams?.latlng?.data ?? null,
          altitude: streams?.altitude?.data ?? null,
          velocity_smooth: streams?.velocity_smooth?.data ?? null,
          heartrate: streams?.heartrate?.data ?? null,
          cadence: streams?.cadence?.data ?? null,
          watts: streams?.watts?.data ?? null,
          moving: streams?.moving?.data ?? null,
        },
        { onConflict: "activity_id" }
      );

    if (streamsUpsertError) {
      console.error(
        `Opslaan van streams mislukt voor rit ${dbId} (Strava-id ${stravaActivityId}):`,
        streamsUpsertError
      );
    }
  } catch (streamError) {
    console.error(
      `Streams ophalen mislukt voor ${stravaActivityId}:`,
      streamError
    );
  }

  attemptedCount++;

  await new Promise((resolve) => setTimeout(resolve, ENRICH_DELAY_MS));
}

// Tel na afloop opnieuw vanuit de database (i.p.v. simpelweg "needsEnrichment
// min aantal pogingen") — een poging kan mislukken (bv. Strava rate limit,
// een databasefout), en dan telt hij niet mee als daadwerkelijk verrijkt.
// Zo blijft het getal dat de gebruiker ziet altijd kloppend en dalend.
const { data: finalEnrichedStreamRows } =
  savedDbIds.length > 0
    ? await supabaseAdmin
        .from("activity_streams")
        .select("activity_id")
        .in("activity_id", savedDbIds)
    : { data: [] as { activity_id: number }[] };

const finalEnrichedDbIds = new Set(
  (finalEnrichedStreamRows || []).map((row) => row.activity_id)
);

remainingToEnrich = savedActivities.filter(
  (activity) => !finalEnrichedDbIds.has(activity.dbId)
).length;
enrichedThisSync = Math.max(needsEnrichment.length - remainingToEnrich, 0);
enrichFailedThisSync = Math.max(attemptedCount - enrichedThisSync, 0);

      if (upsertError) {
        console.error("Strava activities database error:", upsertError);

        return NextResponse.json(
          { error: "Strava-activiteiten konden niet worden opgeslagen." },
          { status: 500 }
        );
      }
    }
await checkBadges(user.id);
await calculateSkills(user.id);
await calculateQuests(user.id);
    return NextResponse.json({
      success: true,
      imported: rows.length,
      enrichedThisSync,
      remainingToEnrich,
      enrichFailedThisSync,
    });
  } catch (error) {
    console.error("Strava sync error:", error);

    return NextResponse.json(
      { error: "Onbekende fout tijdens synchroniseren." },
      { status: 500 }
    );
  }
}
