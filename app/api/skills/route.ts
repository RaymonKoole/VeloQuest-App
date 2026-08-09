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

    const { data: skills, error: skillsError } =
      await supabaseAdmin
        .from("skills")
        .select("id, name, description, icon")
        .order("id");

    if (skillsError) {
      console.error("Skills database error:", skillsError);

      return NextResponse.json(
        { error: "Skills konden niet worden opgehaald." },
        { status: 500 }
      );
    }

    const { data: userSkills, error: userSkillsError } =
      await supabaseAdmin
        .from("user_skills")
        .select("skill_id, xp, level")
        .eq("user_id", user.id);

    if (userSkillsError) {
      console.error("User skills database error:", userSkillsError);

      return NextResponse.json(
        { error: "Skill voortgang kon niet worden opgehaald." },
        { status: 500 }
      );
    }

    const userSkillMap = new Map(
      (userSkills || []).map((skill) => [
        skill.skill_id,
        skill,
      ])
    );

    const result = (skills || []).map((skill) => {
      const progress = userSkillMap.get(skill.id);

      return {
        ...skill,
        xp: progress?.xp || 0,
        level: progress?.level || 1,
      };
    });

    return NextResponse.json({
      skills: result,
    });
  } catch (error) {
    console.error("Skills API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij ophalen skills." },
      { status: 500 }
    );
  }
}
