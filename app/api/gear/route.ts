import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLevelFromXp } from "@/lib/xp/level";

export async function GET(request: NextRequest) {
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

    const { data: gearItems, error: gearError } = await supabaseAdmin
      .from("gear_items")
      .select(
        "id, slot, name, tier, rarity, required_skill, required_level, icon, color, description"
      )
      .order("slot")
      .order("tier");

    if (gearError) {
      console.error("Gear database error:", gearError);

      return NextResponse.json(
        { error: "Kleding kon niet worden opgehaald." },
        { status: 500 }
      );
    }

    const { data: xpRows } = await supabaseAdmin
      .from("activity_xp")
      .select("total_xp")
      .eq("user_id", user.id);

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
      .eq("user_id", user.id);

    const skillLevelByName = new Map<string, number>();

    for (const row of skillRows || []) {
      const skillName = skillNameById.get(row.skill_id);

      if (skillName) {
        skillLevelByName.set(skillName, row.level);
      }
    }

    const { data: ownedRows } = await supabaseAdmin
      .from("user_gear")
      .select("item_id")
      .eq("user_id", user.id);

    const ownedItemIds = new Set((ownedRows || []).map((row) => row.item_id));

    const { data: equippedRows } = await supabaseAdmin
      .from("user_equipment")
      .select("slot, item_id")
      .eq("user_id", user.id);

    const equippedItemIdBySlot = new Map(
      (equippedRows || []).map((row) => [row.slot, row.item_id])
    );

    const items = (gearItems || []).map((item) => {
      const currentLevel = item.required_skill
        ? skillLevelByName.get(item.required_skill) ?? 1
        : accountLevel;

      return {
        id: item.id,
        slot: item.slot,
        name: item.name,
        tier: item.tier,
        rarity: item.rarity,
        requiredSkill: item.required_skill,
        requiredLevel: item.required_level,
        icon: item.icon,
        color: item.color,
        description: item.description,
        owned: ownedItemIds.has(item.id),
        equipped: equippedItemIdBySlot.get(item.slot) === item.id,
        eligible: currentLevel >= item.required_level,
      };
    });

    return NextResponse.json({
      accountLevel,
      items,
    });
  } catch (error) {
    console.error("Gear API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij het ophalen van kleding." },
      { status: 500 }
    );
  }
}
