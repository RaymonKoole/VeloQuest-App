import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserLevels, isEligibleForGear } from "@/lib/gear/getUserLevels";

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

    const body = await request.json();
    const itemId = Number(body.itemId);

    if (!itemId || Number.isNaN(itemId)) {
      return NextResponse.json(
        { error: "Geen geldig kledingstuk opgegeven." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: item, error: itemError } = await supabaseAdmin
      .from("gear_items")
      .select("id, required_skill, required_level, name")
      .eq("id", itemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: "Kledingstuk niet gevonden." },
        { status: 404 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("user_gear")
      .select("id")
      .eq("user_id", user.id)
      .eq("item_id", itemId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Dit kledingstuk heb je al." },
        { status: 409 }
      );
    }

    // Nooit vertrouwen op wat de client denkt dat "eligible" is — altijd
    // server-side het huidige level opnieuw controleren voordat we iets
    // toevoegen aan de garderobe van de gebruiker.
    const levels = await getUserLevels(supabaseAdmin, user.id);

    if (!isEligibleForGear(item, levels)) {
      const requirement = item.required_skill
        ? `${item.required_skill}-skill level ${item.required_level}`
        : `account-level ${item.required_level}`;

      return NextResponse.json(
        { error: `Je level is nog niet hoog genoeg (vereist: ${requirement}).` },
        { status: 403 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("user_gear")
      .insert({ user_id: user.id, item_id: itemId });

    if (insertError) {
      console.error("Gear buy database error:", insertError);

      return NextResponse.json(
        { error: "Kledingstuk kon niet worden toegevoegd aan je garderobe." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, itemName: item.name });
  } catch (error) {
    console.error("Gear buy API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij het kopen van kleding." },
      { status: 500 }
    );
  }
}
