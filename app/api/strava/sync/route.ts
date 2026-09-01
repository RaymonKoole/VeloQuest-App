import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateActivityXp } from "@/lib/xp/calculate";
import { checkBadges } from "@/lib/badges/checkBadges";
import { calculateSkills } from "@/lib/skills/calculateSkills";
import { calculateQuests } from "@/lib/quests/calculateQuests";
import { getValidStravaAccessToken } from "@/lib/strava/getAccessToken";
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
      start_lat: activity.start_latlng?.[0] ?? null,
      start_lng: activity.start_latlng?.[1] ?? null,
      summary_polyline: activity.map?.summary_polyline ?? null,
    }));

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
}
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
    });
  } catch (error) {
    console.error("Strava sync error:", error);

    return NextResponse.json(
      { error: "Onbekende fout tijdens synchroniseren." },
      { status: 500 }
    );
  }
}
