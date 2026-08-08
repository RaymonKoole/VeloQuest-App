import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateActivityXp } from "@/lib/xp/calculate";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Geen Supabase-sessie ontvangen." },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "");

    // Controleer de ingelogde gebruiker
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

    // Server-side client met service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Haal alle fietsactiviteiten van deze gebruiker op
    const { data: activities, error: activitiesError } =
      await supabaseAdmin
        .from("strava_activities")
        .select(
          `
            id,
            distance,
            total_elevation_gain,
            activity_type
          `
        )
        .eq("user_id", user.id)
        .in("activity_type", ["Ride", "GravelRide"]);

    if (activitiesError) {
      console.error("XP activities error:", activitiesError);

      return NextResponse.json(
        { error: "Activiteiten konden niet worden opgehaald." },
        { status: 500 }
      );
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({
        message: "Geen fietsactiviteiten gevonden.",
        processed: 0,
      });
    }

    let processed = 0;

    for (const activity of activities) {
      const xp = calculateActivityXp(activity);

      const { error: upsertError } = await supabaseAdmin
        .from("activity_xp")
        .upsert(
          {
            user_id: user.id,
            activity_id: activity.id,
            distance_xp: xp.distanceXp,
            elevation_xp: xp.elevationXp,
            bonus_xp: xp.bonusXp,
            total_xp: xp.totalXp,
          },
          {
            onConflict: "activity_id",
          }
        );

      if (upsertError) {
        console.error(
          `XP opslaan mislukt voor activiteit ${activity.id}:`,
          upsertError
        );

        return NextResponse.json(
          {
            error: "XP kon niet worden opgeslagen.",
            activityId: activity.id,
          },
          { status: 500 }
        );
      }

      processed++;
    }

    return NextResponse.json({
      message: "XP succesvol berekend.",
      processed,
    });
  } catch (error) {
    console.error("XP sync error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij XP-berekening." },
      { status: 500 }
    );
  }
}
