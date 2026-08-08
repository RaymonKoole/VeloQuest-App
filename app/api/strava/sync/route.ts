import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const { data: stravaAccount, error: accountError } =
      await supabaseAdmin
        .from("strava_accounts")
        .select("access_token")
        .eq("user_id", user.id)
        .maybeSingle();

    if (accountError) {
      console.error("Strava account error:", accountError);

      return NextResponse.json(
        { error: "Strava-account kon niet worden gevonden." },
        { status: 500 }
      );
    }

    if (!stravaAccount) {
      return NextResponse.json(
        { error: "Geen Strava-account gekoppeld." },
        { status: 404 }
      );
    }

    const allActivities: any[] = [];
    let page = 1;

    while (true) {
      const response = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${stravaAccount.access_token}`,
          },
        }
      );

      const activities = await response.json();

      if (!response.ok) {
        console.error("Strava activities error:", activities);

        return NextResponse.json(
          { error: "Strava-activiteiten konden niet worden opgehaald." },
          { status: response.status }
        );
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
    }));

    if (rows.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("strava_activities")
        .upsert(rows, {
          onConflict: "user_id,strava_activity_id",
        });

      if (upsertError) {
        console.error("Strava activities database error:", upsertError);

        return NextResponse.json(
          { error: "Strava-activiteiten konden niet worden opgeslagen." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      imported: rows.length,
    });
  } catch (error) {
    console.error("Strava sync error:", error);

    return NextResponse.json(
      { error: "Onbekende fout tijdens synchroniseren." },
      { status: 500 }
    );
  }
}
