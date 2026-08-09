import { createClient } from "@supabase/supabase-js";

export async function checkBadges(userId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: activities, error: activitiesError } =
    await supabaseAdmin
      .from("strava_activities")
      .select("id, distance, total_elevation_gain, activity_type")
      .eq("user_id", userId)
      .in("activity_type", ["Ride", "GravelRide"]);

  if (activitiesError) {
    throw new Error("Activiteiten konden niet worden opgehaald.");
  }

  const totalRides = activities.length;

  const totalDistance =
    activities.reduce(
      (total, activity) => total + (activity.distance || 0),
      0
    ) / 1000;

  const totalElevation = activities.reduce(
    (total, activity) =>
      total + (activity.total_elevation_gain || 0),
    0
  );

  const { data: badges, error: badgesError } =
    await supabaseAdmin
      .from("badges")
      .select("*");

  if (badgesError) {
    throw new Error("Badges konden niet worden opgehaald.");
  }

  for (const badge of badges || []) {
    let unlocked = false;

    if (badge.requirement_type === "rides") {
      unlocked = totalRides >= badge.requirement_value;
    }

    if (badge.requirement_type === "distance") {
      unlocked = totalDistance >= badge.requirement_value;
    }

    if (badge.requirement_type === "elevation") {
      unlocked = totalElevation >= badge.requirement_value;
    }

    if (!unlocked) {
      continue;
    }

    await supabaseAdmin
      .from("user_badges")
      .upsert(
        {
          user_id: userId,
          badge_id: badge.id,
        },
        {
          onConflict: "user_id,badge_id",
        }
      );
  }
}
