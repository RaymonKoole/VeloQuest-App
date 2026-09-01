import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { detectStops } from "@/lib/streams/detectStops";
import { findNearbyPoi } from "@/lib/geocode/findNearbyPoi";

export const maxDuration = 30;

const MAX_ACTIVITIES_PER_REQUEST = 5;
const MAX_POI_LOOKUPS_PER_REQUEST = 10;
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

    for (const streamRow of unprocessedStreams || []) {
      const stops = detectStops({
        time: streamRow.time || [],
        latlng: streamRow.latlng || [],
        velocitySmooth: streamRow.velocity_smooth || undefined,
        moving: streamRow.moving || undefined,
      });

      for (const stop of stops) {
        let poi: { name: string; type: string } | null = null;

        if (poiLookupsUsed < MAX_POI_LOOKUPS_PER_REQUEST) {
          try {
            poi = await findNearbyPoi(stop.lat, stop.lng);
          } catch (poiError) {
            console.error("POI-lookup mislukt:", poiError);
          }

          poiLookupsUsed++;
          await new Promise((resolve) => setTimeout(resolve, POI_LOOKUP_DELAY_MS));
        }

        await supabaseAdmin.from("activity_stops").insert({
          activity_id: streamRow.activity_id,
          user_id: user.id,
          lat: stop.lat,
          lng: stop.lng,
          duration_seconds: stop.durationSeconds,
          poi_name: poi?.name ?? null,
          poi_type: poi?.type ?? null,
        });
      }

      await supabaseAdmin
        .from("activity_streams")
        .update({ stops_processed: true })
        .eq("activity_id", streamRow.activity_id);
    }

    const { data: allStops } = await supabaseAdmin
      .from("activity_stops")
      .select("poi_name, poi_type")
      .eq("user_id", user.id)
      .not("poi_name", "is", null);

    const poiCounts = new Map<string, number>();

    for (const stop of allStops || []) {
      poiCounts.set(stop.poi_name, (poiCounts.get(stop.poi_name) || 0) + 1);
    }

    const favoriteStop = Array.from(poiCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return NextResponse.json({
      favoriteStop: favoriteStop
        ? { name: favoriteStop[0], count: favoriteStop[1] }
        : null,
      totalStopsWithPoi: (allStops || []).length,
    });
  } catch (error) {
    console.error("Stops API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij het ophalen van pauzeplekken." },
      { status: 500 }
    );
  }
}
