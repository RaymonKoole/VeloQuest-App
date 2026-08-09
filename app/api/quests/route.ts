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

    const { data: quests, error: questsError } =
      await supabaseAdmin
        .from("quests")
        .select(
          "id, name, description, icon, requirement_type, requirement_value, reward_xp"
        )
        .order("id");

    if (questsError) {
      console.error("Quests database error:", questsError);

      return NextResponse.json(
        { error: "Quests konden niet worden opgehaald." },
        { status: 500 }
      );
    }

    const { data: userQuests, error: userQuestsError } =
      await supabaseAdmin
        .from("user_quests")
        .select(
          "quest_id, progress, completed, completed_at"
        )
        .eq("user_id", user.id);

    if (userQuestsError) {
      console.error(
        "User quests database error:",
        userQuestsError
      );

      return NextResponse.json(
        { error: "Quest voortgang kon niet worden opgehaald." },
        { status: 500 }
      );
    }

    const progressMap = new Map(
      (userQuests || []).map((quest) => [
        quest.quest_id,
        quest,
      ])
    );

    const result = (quests || []).map((quest) => {
      const progress = progressMap.get(quest.id);

      return {
        ...quest,
        progress: progress?.progress || 0,
        completed: progress?.completed || false,
        completed_at: progress?.completed_at || null,
      };
    });

    return NextResponse.json({
      quests: result,
    });
  } catch (error) {
    console.error("Quests API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij ophalen quests." },
      { status: 500 }
    );
  }
}
