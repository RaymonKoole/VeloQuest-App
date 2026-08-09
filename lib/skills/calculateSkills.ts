import { createClient } from "@supabase/supabase-js";

export async function calculateSkills(userId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: activities, error: activitiesError } =
    await supabaseAdmin
      .from("strava_activities")
      .select(
        "distance, total_elevation_gain, moving_time, activity_type"
      )
      .eq("user_id", userId)
      .in("activity_type", ["Ride", "GravelRide"]);

  if (activitiesError) {
    throw new Error("Activiteiten konden niet worden opgehaald.");
  }

  const totalDistance =
    (activities || []).reduce(
      (total, activity) => total + (activity.distance || 0),
      0
    ) / 1000;

  const totalElevation =
    (activities || []).reduce(
      (total, activity) =>
        total + (activity.total_elevation_gain || 0),
      0
    );

  const totalMovingTimeMinutes =
    (activities || []).reduce(
      (total, activity) =>
        total + (activity.moving_time || 0),
      0
    ) / 60;

  const totalRides = activities?.length || 0;

  const skillXp = {
    Cycling: totalDistance,
    Climbing: totalElevation / 10,
    Endurance: totalMovingTimeMinutes / 10,
    Explorer: totalRides,
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

    const level = Math.floor(Math.sqrt(xp / 100)) + 1;

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

  return {
    Cycling: Math.round(skillXp.Cycling * 100) / 100,
    Climbing: Math.round(skillXp.Climbing * 100) / 100,
    Endurance: Math.round(skillXp.Endurance * 100) / 100,
    Explorer: Math.round(skillXp.Explorer * 100) / 100,
  };
}
