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

    // Controleer de ingelogde gebruiker
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

    // Server-side client voor het ophalen van XP
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: xpRows, error: xpError } = await supabaseAdmin
      .from("activity_xp")
      .select("total_xp")
      .eq("user_id", user.id);

    if (xpError) {
      console.error("XP database error:", xpError);

      return NextResponse.json(
        { error: "XP kon niet worden opgehaald." },
        { status: 500 }
      );
    }

    const totalXp = (xpRows || []).reduce(
      (sum, row) => sum + (row.total_xp || 0),
      0
    );

    const levelData = getLevelFromXp(totalXp);

    return NextResponse.json(levelData);
  } catch (error) {
    console.error("XP API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij ophalen van XP." },
      { status: 500 }
    );
  }
}
