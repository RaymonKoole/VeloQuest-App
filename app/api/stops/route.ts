import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { detectStops } from "@/lib/streams/detectStops";
import { findNearbyPoi } from "@/lib/geocode/findNearbyPoi";

export const maxDuration = 30;

const MAX_ACTIVITIES_PER_REQUEST = 8;
const MAX_POI_LOOKUPS_PER_REQUEST = 15;
const POI_LOOKUP_DELAY_MS = 700;

export async function GET(request: NextRequest) {
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

    const { data: unprocessedStreams, error: streamsError } =
      await supabaseAdmin
        .from("activity_streams")
        .select("activity_id, time, latlng, velocity_smooth, moving")
        .eq("user_id", user.id)
        .eq("stops_processed", false)
        .limit(MAX_ACTIVITIES_PER_REQUEST);

    if (streamsError) {
      console.error("Stops database error:", streamsError);

      return NextResponse.json(
        { error: "Streams konden niet worden opgehaald." },
        { status: 500 }
      );
    }

    let poiLookupsUsed = 0;
    // Als Overpass een keer volledig onbereikbaar blijkt (alle mirrors falen),
    // heeft verder proberen deze aanvraag geen zin en kost het alleen tijd
    // (die op kan raken binnen het maxDuration-budget). Sla POI-lookups dan
    // over voor de rest van deze aanvraag; een volgende aanvraag probeert het
    // gewoon weer opnieuw.
    let overpassUnavailable = false;

    for (const streamRow of unprocessedStreams || []) {
      const stops = detectStops({
        time: streamRow.time || [],
        latlng: streamRow.latlng || [],
        velocitySmooth: streamRow.velocity_smooth || undefined,
        moving: streamRow.moving || undefined,
      });

      // Als een stop hier geen (geslaagde) POI-check kreeg — omdat het
      // lookup-budget van deze aanvraag al op was, of omdat Overpass net
      // onbereikbaar bleek — markeren we deze rit bewust niet als verwerkt,
      // zodat een volgende aanvraag het opnieuw probeert i.p.v. de rit voor
      // altijd zonder café-info te laten.
      let rowFullyProcessed = true;
      const stopRows: {
        activity_id: number;
        user_id: string;
        lat: number;
        lng: number;
        duration_seconds: number;
        poi_name: string | null;
        poi_type: string | null;
      }[] = [];

      for (const stop of stops) {
        let poi: { name: string; type: string } | null = null;
        let attempted = false;

        if (poiLookupsUsed < MAX_POI_LOOKUPS_PER_REQUEST && !overpassUnavailable) {
          attempted = true;

          try {
            poi = await findNearbyPoi(stop.lat, stop.lng);
          } catch (poiError) {
            console.error("POI-lookup mislukt (Overpass waarschijnlijk niet bereikbaar):", poiError);
            overpassUnavailable = true;
          }

          poiLookupsUsed++;

          if (!overpassUnavailable) {
            await new Promise((resolve) => setTimeout(resolve, POI_LOOKUP_DELAY_MS));
          }
        }

        if (!attempted || overpassUnavailable) {
          rowFullyProcessed = false;
        }

        stopRows.push({
          activity_id: streamRow.activity_id,
          user_id: user.id,
          lat: stop.lat,
          lng: stop.lng,
          duration_seconds: stop.durationSeconds,
          poi_name: poi?.name ?? null,
          poi_type: poi?.type ?? null,
        });
      }

      // Vervang eerdere (mogelijk onvolledige) resultaten voor deze rit door
      // de huidige, zodat een retry geen dubbele pauzes oplevert.
      await supabaseAdmin
        .from("activity_stops")
        .delete()
        .eq("activity_id", streamRow.activity_id);

      if (stopRows.length > 0) {
        await supabaseAdmin.from("activity_stops").insert(stopRows);
      }

      if (rowFullyProcessed) {
        await supabaseAdmin
          .from("activity_streams")
          .update({ stops_processed: true })
          .eq("activity_id", streamRow.activity_id);
      }
    }

    // Herbekijk met eventueel overgebleven POI-budget ook een aantal eerder
    // gecontroleerde pauzes zonder gevonden café — bijvoorbeeld omdat de
    // zoekstraal destijds kleiner was. Dit is een beste-poging: sommige
    // pauzes hebben simpelweg geen café in de buurt, dus dit hoeft niet per
    // se naar 0 te gaan.
    if (poiLookupsUsed < MAX_POI_LOOKUPS_PER_REQUEST && !overpassUnavailable) {
      const { data: missingPoiStops } = await supabaseAdmin
        .from("activity_stops")
        .select("id, lat, lng")
        .eq("user_id", user.id)
        .is("poi_name", null)
        .limit(MAX_POI_LOOKUPS_PER_REQUEST - poiLookupsUsed);

      for (const stopRow of missingPoiStops || []) {
        if (poiLookupsUsed >= MAX_POI_LOOKUPS_PER_REQUEST || overpassUnavailable) {
          break;
        }

        let poi: { name: string; type: string } | null = null;

        try {
          poi = await findNearbyPoi(stopRow.lat, stopRow.lng);
        } catch (poiError) {
          console.error(
            "Herbekijken van pauze zonder café mislukt (Overpass waarschijnlijk niet bereikbaar):",
            poiError
          );
          overpassUnavailable = true;
        }

        poiLookupsUsed++;

        if (!overpassUnavailable) {
          await new Promise((resolve) => setTimeout(resolve, POI_LOOKUP_DELAY_MS));
        }

        if (poi) {
          const { error: updateError } = await supabaseAdmin
            .from("activity_stops")
            .update({ poi_name: poi.name, poi_type: poi.type })
            .eq("id", stopRow.id);

          if (updateError) {
            console.error(
              `Bijwerken van pauze ${stopRow.id} mislukt:`,
              updateError
            );
          }
        }
      }
    }

    const { count: remainingStreams } = await supabaseAdmin
      .from("activity_streams")
      .select("activity_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("stops_processed", false);

    const { data: allStops } = await supabaseAdmin
      .from("activity_stops")
      .select("duration_seconds, poi_name")
      .eq("user_id", user.id);

    const poiCounts = new Map<string, number>();
    let longestStop: { durationSeconds: number; poiName: string | null } | null = null;

    for (const stop of allStops || []) {
      if (stop.poi_name) {
        poiCounts.set(stop.poi_name, (poiCounts.get(stop.poi_name) || 0) + 1);
      }

      if (!longestStop || (stop.duration_seconds || 0) > longestStop.durationSeconds) {
        longestStop = {
          durationSeconds: stop.duration_seconds || 0,
          poiName: stop.poi_name ?? null,
        };
      }
    }

    const favoriteStop = Array.from(poiCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return NextResponse.json({
      favoriteStop: favoriteStop
        ? { name: favoriteStop[0], count: favoriteStop[1] }
        : null,
      totalStopsWithPoi: (allStops || []).filter((stop) => stop.poi_name).length,
      totalStops: (allStops || []).length,
      longestStop:
        longestStop && longestStop.durationSeconds > 0 ? longestStop : null,
      remainingStreams: remainingStreams || 0,
    });
  } catch (error) {
    console.error("Stops API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij het ophalen van pauzeplekken." },
      { status: 500 }
    );
  }
}
