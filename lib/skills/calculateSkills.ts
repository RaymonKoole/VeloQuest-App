import { createClient } from "@supabase/supabase-js";
import { getSkillLevelFromXp } from "@/lib/progression/skillLevel";
import { calculateLongestStreak } from "@/lib/stats/longestStreak";

// Ritten die sneller dan dit gemiddelde zijn, tellen mee voor de Speed-skill.
const SPEED_SKILL_THRESHOLD_KMH = 20;

export async function calculateSkills(userId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: activities, error: activitiesError } =
    await supabaseAdmin
      .from("strava_activities")
      .select(
        "id, distance, total_elevation_gain, moving_time, activity_type, average_speed, city, country, start_date"
      )
      .eq("user_id", userId)
      .in("activity_type", ["Ride", "GravelRide"]);

  if (activitiesError) {
    throw new Error("Activiteiten konden niet worden opgehaald.");
  }

  const rides = activities || [];

  const totalDistance =
    rides.reduce((total, activity) => total + (activity.distance || 0), 0) /
    1000;

  const totalElevation = rides.reduce(
    (total, activity) => total + (activity.total_elevation_gain || 0),
    0
  );

  const totalMovingTimeMinutes =
    rides.reduce((total, activity) => total + (activity.moving_time || 0), 0) /
    60;

  const totalRides = rides.length;

  const gravelDistanceKm =
    rides
      .filter((activity) => activity.activity_type === "GravelRide")
      .reduce((total, activity) => total + (activity.distance || 0), 0) / 1000;

  const fastDistanceKm =
    rides
      .filter(
        (activity) =>
          ((activity.average_speed || 0) * 3.6) > SPEED_SKILL_THRESHOLD_KMH
      )
      .reduce((total, activity) => total + (activity.distance || 0), 0) / 1000;

  const uniquePlaces = new Set(
    rides
      .filter((activity) => activity.city)
      .map((activity) => `${activity.city}|${activity.country}`)
  ).size;

  const longestStreak = calculateLongestStreak(
    rides.map((activity) => activity.start_date)
  );

  const rideIds = rides.map((activity) => activity.id);

  const { count: segmentAttempts } =
    rideIds.length > 0
      ? await supabaseAdmin
          .from("activity_segment_efforts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
      : { count: 0 };

  const { count: prCount } =
    rideIds.length > 0
      ? await supabaseAdmin
          .from("activity_segment_efforts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("pr_rank", 1)
      : { count: 0 };

  const { count: cafeStops } =
    rideIds.length > 0
      ? await supabaseAdmin
          .from("activity_stops")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .not("poi_name", "is", null)
      : { count: 0 };

  const skillXp = {
    Cycling: totalDistance,
    Climbing: totalElevation / 10,
    Endurance: totalMovingTimeMinutes / 10,
    Explorer: totalRides,
    Speed: fastDistanceKm,
    Racing: (segmentAttempts || 0) + (prCount || 0) * 5,
    Adventure: gravelDistanceKm,
    Navigator: uniquePlaces * 20,
    Social: (cafeStops || 0) * 3,
    Discipline: longestStreak * 100,
  };

  const { data: skills, error: skillsError } =
    await supabaseAdmin
      .from("skills")
      .select("id, name");

  if (skillsError) {
    throw new Error("Skills konden niet worden opgehaald.");
  }

  for (const skill of skills || []) {
    const xp = skillXp[skill.name as keyof typeof skillXp];

    if (xp === undefined) {
      continue;
    }

    const level = getSkillLevelFromXp(xp);

    const { error: upsertError } =
      await supabaseAdmin
        .from("user_skills")
        .upsert(
          {
            user_id: userId,
            skill_id: skill.id,
            xp,
            level,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,skill_id",
          }
        );

    if (upsertError) {
      console.error(
        `Skill ${skill.name} opslaan mislukt:`,
        upsertError
      );
    }
  }

  const rounded: Record<string, number> = {};

  for (const [name, xp] of Object.entries(skillXp)) {
    rounded[name] = Math.round(xp * 100) / 100;
  }

  return rounded;
}
