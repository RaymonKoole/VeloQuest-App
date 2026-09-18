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
        "id, distance, total_elevation_gain, moving_time, activity_type, average_speed, city, country, start_date, calories, kudos_count"
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

  const totalCalories = rides.reduce(
    (total, activity) => total + (activity.calories || 0),
    0
  );

  const totalKudos = rides.reduce(
    (total, activity) => total + (activity.kudos_count || 0),
    0
  );

  // Meteorologische seizoenen (noordelijk halfrond): winter = dec/jan/feb,
  // lente = mrt/apr/mei, zomer = jun/jul/aug, herfst = sep/okt/nov.
  const seasonRideCounts = { winter: 0, spring: 0, summer: 0, autumn: 0 };

  for (const activity of rides) {
    if (!activity.start_date) {
      continue;
    }

    const month = new Date(activity.start_date).getUTCMonth();

    if (month === 11 || month === 0 || month === 1) {
      seasonRideCounts.winter += 1;
    } else if (month >= 2 && month <= 4) {
      seasonRideCounts.spring += 1;
    } else if (month >= 5 && month <= 7) {
      seasonRideCounts.summer += 1;
    } else {
      seasonRideCounts.autumn += 1;
    }
  }

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

  // Elke skill gebruikt een heel andere ruwe eenheid (km, calorieën, aantal
  // ritten, minuten...) terwijl er maar één gedeelde XP-curve is
  // (lib/progression/skillLevel.ts). Zonder normalisatie zouden skills met van
  // nature grote ruwe getallen (bv. Power via calorieën) veel sneller
  // niveaus stijgen dan skills met kleine getallen (bv. Explorer via
  // ritaantal), ook al steek je er evenveel moeite in. Deze vermenigvuldigers
  // zijn zo gekozen dat een vergelijkbaar actief fietsjaar in elke skill tot
  // een vergelijkbaar niveau leidt (Runescape-achtig: dezelfde curve, maar
  // afgestemde XP-opbrengst per skill) — schattingen op basis van realistische
  // jaarstatistieken, bij te stellen als het in de praktijk scheef aanvoelt.
  const skillXp = {
    Cycling: totalDistance * 24,
    Climbing: totalElevation * 3.3,
    Endurance: totalMovingTimeMinutes * 7.5,
    Explorer: totalRides * 880,
    Speed: fastDistanceKm * 53,
    Racing: ((segmentAttempts || 0) + (prCount || 0) * 5) * 125,
    Adventure: gravelDistanceKm * 165,
    Navigator: uniquePlaces * 8800,
    Social: (cafeStops || 0) * 2650,
    Discipline: longestStreak * 8800,
    Power: totalCalories * 0.66,
    Popularity: totalKudos * 66,
    Winter: seasonRideCounts.winter * 3600,
    Spring: seasonRideCounts.spring * 3600,
    Summer: seasonRideCounts.summer * 3600,
    Autumn: seasonRideCounts.autumn * 3600,
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
