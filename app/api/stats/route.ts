import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CYCLING_TYPES = ["Ride", "GravelRide"];

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
          `
            distance,
            moving_time,
            total_elevation_gain,
            activity_type
          `
        )
        .eq("user_id", user.id)
        .in("activity_type", CYCLING_TYPES);

    if (activitiesError) {
      console.error("Stats database error:", activitiesError);

      return NextResponse.json(
        { error: "Statistieken konden niet worden berekend." },
        { status: 500 }
      );
    }

    const totalDistance = activities.reduce(
      (total, activity) => total + (activity.distance || 0),
      0
    );

    const totalElevation = activities.reduce(
      (total, activity) =>
        total + (activity.total_elevation_gain || 0),
      0
    );

    const totalMovingTime = activities.reduce(
      (total, activity) => total + (activity.moving_time || 0),
      0
    );

    return NextResponse.json({
      totalDistance,
      totalElevation,
      totalMovingTime,
      totalActivities: activities.length,
    });
  } catch (error) {
    console.error("Stats API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij berekenen van statistieken." },
      { status: 500 }
    );
  }
}
