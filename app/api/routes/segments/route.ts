import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dedupeRouteSegments } from "@/lib/routes/dedupeRouteSegments";

export const maxDuration = 30;

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

    const country = request.nextUrl.searchParams.get("country") || "";
    const city = request.nextUrl.searchParams.get("city") || "";

    let ridesQuery = supabaseAdmin
      .from("strava_activities")
      .select("id")
      .eq("user_id", user.id)
      .in("activity_type", ["Ride", "GravelRide"]);

    if (country) {
      ridesQuery = ridesQuery.eq("country", country);
    }

    if (city) {
      ridesQuery = ridesQuery.eq("city", city);
    }

    const { data: rideActivities, error: activitiesError } = await ridesQuery;

    if (activitiesError) {
      console.error("Route-segments database error:", activitiesError);

      return NextResponse.json(
        { error: "Ritten konden niet worden opgehaald." },
        { status: 500 }
      );
    }

    const rideActivityIds = (rideActivities || []).map((activity) => activity.id);

    if (rideActivityIds.length === 0) {
      return NextResponse.json({ segments: [] });
    }

    const { data: streamRows, error: streamsError } = await supabaseAdmin
      .from("activity_streams")
      .select("latlng")
      .eq("user_id", user.id)
      .in("activity_id", rideActivityIds)
      .not("latlng", "is", null);

    if (streamsError) {
      console.error("Route-segments streams-fout:", streamsError);

      return NextResponse.json(
        { error: "GPS-data kon niet worden opgehaald." },
        { status: 500 }
      );
    }

    const polylines = (streamRows || [])
      .map((row) => row.latlng as [number, number][] | null)
      .filter(
        (points): points is [number, number][] =>
          Array.isArray(points) && points.length > 1
      );

    const segments = dedupeRouteSegments(polylines);

    return NextResponse.json({ segments });
  } catch (error) {
    console.error("Route-segments API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij het berekenen van unieke routes." },
      { status: 500 }
    );
  }
}
