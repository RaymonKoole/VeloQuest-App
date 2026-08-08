import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
            id,
            strava_activity_id,
            name,
            activity_type,
            distance,
            moving_time,
            elapsed_time,
            total_elevation_gain,
            start_date,
            average_speed,
            max_speed
          `
        )
        .eq("user_id", user.id)
        .order("start_date", { ascending: false });

    if (activitiesError) {
      console.error("Activities database error:", activitiesError);

      return NextResponse.json(
        { error: "Activiteiten konden niet worden opgehaald." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      activities,
      count: activities.length,
    });
  } catch (error) {
    console.error("Activities API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij ophalen van activiteiten." },
      { status: 500 }
    );
  }
}
