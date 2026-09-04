import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VALID_SLOTS = [
  "jersey",
  "shorts",
  "helmet",
  "shoes",
  "gloves",
  "glasses",
  "socks",
  "accessory",
];

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
    const slot = typeof body.slot === "string" ? body.slot : "";
    const itemId = body.itemId === null ? null : Number(body.itemId);

    if (!VALID_SLOTS.includes(slot)) {
      return NextResponse.json(
        { error: "Ongeldig kledingslot." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (itemId === null) {
      const { error: deleteError } = await supabaseAdmin
        .from("user_equipment")
        .delete()
        .eq("user_id", user.id)
        .eq("slot", slot);

      if (deleteError) {
        console.error("Gear unequip database error:", deleteError);

        return NextResponse.json(
          { error: "Kledingstuk kon niet worden uitgetrokken." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (Number.isNaN(itemId)) {
      return NextResponse.json(
        { error: "Geen geldig kledingstuk opgegeven." },
        { status: 400 }
      );
    }

    // Nooit vertrouwen op de client: controleer dat de gebruiker dit item
    // echt bezit én dat het bij het opgegeven slot hoort. Twee losse queries
    // i.p.v. een embedded join, om niet afhankelijk te zijn van hoe
    // PostgREST de foreign-key-relatie precies blootstelt.
    const { data: ownedRow, error: ownedError } = await supabaseAdmin
      .from("user_gear")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("item_id", itemId)
      .maybeSingle();

    if (ownedError) {
      console.error("Gear equip lookup error:", ownedError);

      return NextResponse.json(
        { error: "Kon kledingstuk niet controleren." },
        { status: 500 }
      );
    }

    if (!ownedRow) {
      return NextResponse.json(
        { error: "Je bezit dit kledingstuk niet." },
        { status: 403 }
      );
    }

    const { data: itemRow } = await supabaseAdmin
      .from("gear_items")
      .select("slot")
      .eq("id", itemId)
      .maybeSingle();

    if (itemRow?.slot !== slot) {
      return NextResponse.json(
        { error: "Dit kledingstuk hoort niet bij dit slot." },
        { status: 400 }
      );
    }

    const { error: upsertError } = await supabaseAdmin
      .from("user_equipment")
      .upsert(
        { user_id: user.id, slot, item_id: itemId },
        { onConflict: "user_id,slot" }
      );

    if (upsertError) {
      console.error("Gear equip database error:", upsertError);

      return NextResponse.json(
        { error: "Kledingstuk kon niet worden uitgerust." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gear equip API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij het uitrusten van kleding." },
      { status: 500 }
    );
  }
}
