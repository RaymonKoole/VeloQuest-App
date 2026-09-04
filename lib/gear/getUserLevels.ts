import { SupabaseClient } from "@supabase/supabase-js";
import { getLevelFromXp } from "@/lib/xp/level";

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

  return { accountLevel, skillLevelByName };
}

export function isEligibleForGear(
  item: { required_skill: string | null; required_level: number },
  levels: { accountLevel: number; skillLevelByName: Map<string, number> }
) {
  const currentLevel = item.required_skill
    ? levels.skillLevelByName.get(item.required_skill) ?? 1
    : levels.accountLevel;

  return currentLevel >= item.required_level;
}
