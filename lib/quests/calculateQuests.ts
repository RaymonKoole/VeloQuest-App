import { createClient } from "@supabase/supabase-js";

export async function calculateQuests(userId: string) {
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
    throw new Error(
      "Activiteiten konden niet worden opgehaald."
    );
  }

  const totalDistance =
    (activities || []).reduce(
      (total, activity) =>
        total + (activity.distance || 0),
      0
    ) / 1000;

  const totalElevation =
    (activities || []).reduce(
      (total, activity) =>
        total + (activity.total_elevation_gain || 0),
      0
    );

  const totalMovingTime =
    (activities || []).reduce(
      (total, activity) =>
        total + (activity.moving_time || 0),
      0
    );

  const totalRides = activities?.length || 0;

  const values = {
    rides: totalRides,
    distance: totalDistance,
    elevation: totalElevation,
    moving_time: totalMovingTime,
  };

  const { data: quests, error: questsError } =
    await supabaseAdmin
      .from("quests")
      .select("*")
      .order("id");

  if (questsError) {
    throw new Error(
      "Quests konden niet worden opgehaald."
    );
  }

  for (const quest of quests || []) {
    const progress = values[
      quest.requirement_type as keyof typeof values
    ] ?? 0;

    const completed =
      progress >= quest.requirement_value;

    const { data: existingQuest } =
  await supabaseAdmin
    .from("user_quests")
    .select("completed")
    .eq("user_id", userId)
    .eq("quest_id", quest.id)
    .maybeSingle();

const update: any = {
  user_id: userId,
  quest_id: quest.id,
  progress,
  completed,
  updated_at: new Date().toISOString(),
};

    if (
  completed &&
  !existingQuest?.completed
) {
  update.completed_at =
    new Date().toISOString();
}

    await supabaseAdmin
      .from("user_quests")
      .upsert(update, {
        onConflict: "user_id,quest_id",
      });
  }

  return {
    rides: totalRides,
    distance: Math.round(totalDistance * 10) / 10,
    elevation: Math.round(totalElevation * 10) / 10,
    movingTime: totalMovingTime,
  };
}
