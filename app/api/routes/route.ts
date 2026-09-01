import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { reverseGeocode } from "@/lib/geocode/reverseGeocode";

const MAX_GEOCODE_PER_REQUEST = 15;
const GEOCODE_DELAY_MS = 1100;

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

    const { data: activities, error: activitiesError } =
      await supabaseAdmin
        .from("strava_activities")
        .select(
          "id, strava_activity_id, name, activity_type, distance, start_date, start_lat, start_lng, summary_polyline, city, country"
        )
        .eq("user_id", user.id)
        .in("activity_type", ["Ride", "GravelRide"])
        .not("start_lat", "is", null)
        .not("start_lng", "is", null)
        .order("start_date", { ascending: false });

    if (activitiesError) {
      console.error("Routes database error:", activitiesError);

      return NextResponse.json(
        { error: "Routes konden niet worden opgehaald." },
        { status: 500 }
      );
    }

    const needsGeocoding = (activities || [])
      .filter((activity) => !activity.city || !activity.country)
      .slice(0, MAX_GEOCODE_PER_REQUEST);

    for (let i = 0; i < needsGeocoding.length; i++) {
      const activity = needsGeocoding[i];

      try {
        const { city, country } = await reverseGeocode(
          activity.start_lat,
          activity.start_lng
        );

        activity.city = city;
        activity.country = country;

        await supabaseAdmin
          .from("strava_activities")
          .update({ city, country })
          .eq("id", activity.id);
      } catch (geocodeError) {
        console.error(
          `Reverse geocoding mislukt voor activiteit ${activity.id}:`,
          geocodeError
        );
      }

      if (i < needsGeocoding.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, GEOCODE_DELAY_MS)
        );
      }
    }

    return NextResponse.json({
      activities,
    });
  } catch (error) {
    console.error("Routes API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij ophalen van routes." },
      { status: 500 }
    );
  }
}
