import { SupabaseClient } from "@supabase/supabase-js";
import { getLevelFromXp } from "@/lib/xp/level";
import { ALL_QUESTS_COMPLETED_GATE } from "@/lib/gear/types";

export async function getUserLevels(
  supabaseAdmin: SupabaseClient,
  userId: string
) {
  const { data: xpRows } = await supabaseAdmin
    .from("activity_xp")
    .select("total_xp")
    .eq("user_id", userId);

  const totalXp = (xpRows || []).reduce(
    (sum, row) => sum + (row.total_xp || 0),
    0
  );
  const accountLevel = getLevelFromXp(totalXp).level;

  const { data: skillDefRows } = await supabaseAdmin
    .from("skills")
    .select("id, name");

  const skillNameById = new Map(
    (skillDefRows || []).map((row) => [row.id, row.name])
  );

  const { data: skillRows } = await supabaseAdmin
    .from("user_skills")
    .select("skill_id, level")
    .eq("user_id", userId);

  const skillLevelByName = new Map<string, number>();

  for (const row of skillRows || []) {
    const skillName = skillNameById.get(row.skill_id);

    if (skillName) {
      skillLevelByName.set(skillName, row.level);
    }
  }

  const { count: totalQuests } = await supabaseAdmin
    .from("quests")
    .select("id", { count: "exact", head: true });

  const { count: completedQuests } = await supabaseAdmin
    .from("user_quests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true);

  const allQuestsCompleted =
    (totalQuests || 0) > 0 && (completedQuests || 0) >= (totalQuests || 0);

  return { accountLevel, skillLevelByName, allQuestsCompleted };
}

export function isEligibleForGear(
  item: { required_skill: string | null; required_level: number },
  levels: {
    accountLevel: number;
    skillLevelByName: Map<string, number>;
    allQuestsCompleted: boolean;
  }
) {
  if (item.required_skill === ALL_QUESTS_COMPLETED_GATE) {
    return levels.allQuestsCompleted;
  }

  const currentLevel = item.required_skill
    ? levels.skillLevelByName.get(item.required_skill) ?? 1
    : levels.accountLevel;

  return currentLevel >= item.required_level;
}
