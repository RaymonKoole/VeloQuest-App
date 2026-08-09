import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const { data: badges, error: badgesError } =
      await supabaseAdmin
        .from("badges")
        .select("*")
        .order("requirement_value", { ascending: true });

    if (badgesError) {
      console.error("Badges database error:", badgesError);

      return NextResponse.json(
        { error: "Badges konden niet worden opgehaald." },
        { status: 500 }
      );
    }

    const { data: userBadges, error: userBadgesError } =
      await supabaseAdmin
        .from("user_badges")
        .select("badge_id, unlocked_at")
        .eq("user_id", user.id);

    if (userBadgesError) {
      console.error("User badges database error:", userBadgesError);

      return NextResponse.json(
        { error: "Gebruikersbadges konden niet worden opgehaald." },
        { status: 500 }
      );
    }

    const unlockedMap = new Map(
      (userBadges || []).map((badge) => [
        badge.badge_id,
        badge.unlocked_at,
      ])
    );

    const result = (badges || []).map((badge) => ({
      ...badge,
      unlocked: unlockedMap.has(badge.id),
      unlocked_at: unlockedMap.get(badge.id) || null,
    }));

    return NextResponse.json({
      badges: result,
    });
  } catch (error) {
    console.error("Badges API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij ophalen badges." },
      { status: 500 }
    );
  }
}
