import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateWeek, getWeekDates, getWeekStart } from "@/lib/training/generateWeek";
import type { WorkoutTypeId } from "@/lib/training/types";

async function previousWeekHadHardDay(
  supabaseAdmin: any,
  userId: string,
  weekStart: string
) {
  const previousWeekStart = getWeekDates(weekStart)[0];
  const previousMonday = new Date(`${previousWeekStart}T00:00:00Z`);
  previousMonday.setUTCDate(previousMonday.getUTCDate() - 7);
  const previousStartIso = previousMonday.toISOString().slice(0, 10);
  const previousDates = getWeekDates(previousStartIso);

  const { data } = await supabaseAdmin
    .from("training_days")
    .select("intensity")
    .eq("user_id", userId)
    .gte("date", previousDates[0])
    .lte("date", previousDates[6]);

  return (data || []).some((row: any) => (row.intensity || 0) >= 4);
}

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

    const requestedDate =
      request.nextUrl.searchParams.get("weekStart") ||
      new Date().toISOString().slice(0, 10);
    const weekStart = getWeekStart(requestedDate);
    const dates = getWeekDates(weekStart);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("training_days")
      .select("date, workout_type, title, description, duration_minutes, intensity, locked, note")
      .eq("user_id", user.id)
      .gte("date", dates[0])
      .lte("date", dates[6]);

    if (existingError) {
      console.error("Training database error:", existingError);

      return NextResponse.json(
        { error: "Trainingsschema kon niet worden opgehaald." },
        { status: 500 }
      );
    }

    let days;

    if ((existing || []).length === 7) {
      days = existing;
    } else {
      const lockedDays = (existing || [])
        .filter((row) => row.locked)
        .map((row) => ({
          date: row.date,
          workoutType: row.workout_type as WorkoutTypeId,
          title: row.title,
          description: row.description,
          durationMinutes: row.duration_minutes,
        }));

      const hadHardDay = await previousWeekHadHardDay(supabaseAdmin, user.id, weekStart);
      const generated = generateWeek(weekStart, lockedDays, hadHardDay);

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
          { error: "Trainingsschema kon niet worden aangemaakt." },
          { status: 500 }
        );
      }

      days = generated.map((day) => ({
        date: day.date,
        workout_type: day.workoutType,
        title: day.title,
        description: day.description,
        duration_minutes: day.durationMinutes,
        intensity: day.intensity,
        locked: day.locked,
        note: day.note,
      }));
    }

    const { data: activities } = await supabaseAdmin
      .from("strava_activities")
      .select("start_date")
      .eq("user_id", user.id)
      .in("activity_type", ["Ride", "GravelRide"])
      .gte("start_date", `${dates[0]}T00:00:00`)
      .lte("start_date", `${dates[6]}T23:59:59`);

    const completedDates = new Set(
      (activities || []).map((row) => row.start_date.slice(0, 10))
    );

    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      weekStart,
      days: sorted.map((day) => ({
        date: day.date,
        workoutType: day.workout_type,
        title: day.title,
        description: day.description,
        durationMinutes: day.duration_minutes,
        intensity: day.intensity,
        locked: day.locked,
        note: day.note,
        completed: completedDates.has(day.date),
      })),
    });
  } catch (error) {
    console.error("Training API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij ophalen trainingsschema." },
      { status: 500 }
    );
  }
}
