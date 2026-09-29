import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateWeek, getWeekDates, getWeekStart } from "@/lib/training/generateWeek";
import { WORKOUT_TYPES, type WorkoutTypeId } from "@/lib/training/types";

async function previousWeekHadHardDay(
  supabaseAdmin: any,
  userId: string,
  weekStart: string
) {
  const previousMonday = new Date(`${weekStart}T00:00:00Z`);
  previousMonday.setUTCDate(previousMonday.getUTCDate() - 7);
  const previousDates = getWeekDates(previousMonday.toISOString().slice(0, 10));

  const { data } = await supabaseAdmin
    .from("training_days")
    .select("intensity")
    .eq("user_id", userId)
    .gte("date", previousDates[0])
    .lte("date", previousDates[6]);

  return (data || []).some((row: any) => (row.intensity || 0) >= 4);
}

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
    const { date, workoutType, title, description, durationMinutes, mode } = body as {
      date?: string;
      workoutType?: WorkoutTypeId;
      title?: string;
      description?: string;
      durationMinutes?: number;
      mode?: "preview" | "apply";
    };

    if (!date || !workoutType || !WORKOUT_TYPES[workoutType]) {
      return NextResponse.json(
        { error: "Ongeldige dag of trainingstype." },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    if (date < today) {
      return NextResponse.json(
        { error: "Je kunt geen dagen in het verleden wijzigen." },
        { status: 400 }
      );
    }

    const weekStart = getWeekStart(date);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("training_days")
      .select("date, workout_type, locked")
      .eq("user_id", user.id)
      .gte("date", getWeekDates(weekStart)[0])
      .lte("date", getWeekDates(weekStart)[6]);

    if (existingError) {
      console.error("Training database error:", existingError);

      return NextResponse.json(
        { error: "Trainingsschema kon niet worden opgehaald." },
        { status: 500 }
      );
    }

    const previousByDate = new Map(
      (existing || []).map((row) => [row.date, row.workout_type])
    );

    const lockedDays = (existing || [])
      .filter((row) => row.locked && row.date !== date)
      .map((row) => ({ date: row.date, workoutType: row.workout_type as WorkoutTypeId }));

    lockedDays.push({
      date,
      workoutType,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(durationMinutes ? { durationMinutes } : {}),
    } as any);

    const hadHardDay = await previousWeekHadHardDay(supabaseAdmin, user.id, weekStart);
    const generated = generateWeek(weekStart, lockedDays, hadHardDay);

    if (mode === "apply") {
      const { error: upsertError } = await supabaseAdmin
        .from("training_days")
        .upsert(
          generated.map((day) => ({
            user_id: user.id,
            date: day.date,
            workout_type: day.workoutType,
            title: day.title,
            description: day.description,
            duration_minutes: day.durationMinutes,
            intensity: day.intensity,
            locked: day.locked,
            note: day.note,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "user_id,date" }
        );

      if (upsertError) {
        console.error("Training upsert error:", upsertError);

        return NextResponse.json(
          { error: "Wijziging kon niet worden opgeslagen." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      weekStart,
      days: generated.map((day) => ({
        ...day,
        changed: previousByDate.get(day.date) !== day.workoutType,
      })),
    });
  } catch (error) {
    console.error("Training day API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij wijzigen trainingsdag." },
      { status: 500 }
    );
  }
}
