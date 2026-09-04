import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserLevels, isEligibleForGear } from "@/lib/gear/getUserLevels";

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

    const levels = await getUserLevels(supabaseAdmin, user.id);
    const { accountLevel } = levels;

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

    const items = (gearItems || []).map((item) => ({
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
      eligible: isEligibleForGear(item, levels),
    }));

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
