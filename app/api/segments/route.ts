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

    const { data: efforts, error: effortsError } = await supabaseAdmin
      .from("activity_segment_efforts")
      .select("activity_id, segment_id, segment_name, elapsed_time, pr_rank, kom_rank")
      .eq("user_id", user.id);

    if (effortsError) {
      console.error("Segments database error:", effortsError);

      return NextResponse.json(
        { error: "Segmenten konden niet worden opgehaald." },
        { status: 500 }
      );
    }

    const activityIds = Array.from(
      new Set((efforts || []).map((effort) => effort.activity_id))
    );

    const { data: activityRows } = activityIds.length
      ? await supabaseAdmin
          .from("strava_activities")
          .select("id, name, start_date")
          .in("id", activityIds)
      : { data: [] as { id: number; name: string | null; start_date: string | null }[] };

    const activityById = new Map(
      (activityRows || []).map((row) => [row.id, row])
    );

    type SegmentAgg = {
      segmentId: number;
      name: string;
      attempts: number;
      bestElapsedSeconds: number;
      isPr: boolean;
      isKom: boolean;
      lastRiddenDate: string | null;
    };

    const bySegment = new Map<number, SegmentAgg>();

    for (const effort of efforts || []) {
      if (!effort.segment_id) {
        continue;
      }

      const activity = activityById.get(effort.activity_id);
      const existing = bySegment.get(effort.segment_id);
      const elapsed = effort.elapsed_time ?? Number.POSITIVE_INFINITY;

      if (!existing) {
        bySegment.set(effort.segment_id, {
          segmentId: effort.segment_id,
          name: effort.segment_name || "Onbekend segment",
          attempts: 1,
          bestElapsedSeconds: elapsed,
          isPr: effort.pr_rank === 1,
          isKom: effort.kom_rank === 1,
          lastRiddenDate: activity?.start_date ?? null,
        });
        continue;
      }

      existing.attempts += 1;
      existing.bestElapsedSeconds = Math.min(existing.bestElapsedSeconds, elapsed);
      existing.isPr = existing.isPr || effort.pr_rank === 1;
      existing.isKom = existing.isKom || effort.kom_rank === 1;

      if (
        activity?.start_date &&
        (!existing.lastRiddenDate || activity.start_date > existing.lastRiddenDate)
      ) {
        existing.lastRiddenDate = activity.start_date;
      }
    }

    const allSegments = Array.from(bySegment.values());

    const prSegments = allSegments
      .filter((segment) => segment.isPr)
      .sort((a, b) => a.name.localeCompare(b.name));

    const mostRiddenSegments = [...allSegments]
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 20);

    return NextResponse.json({
      totalSegments: allSegments.length,
      prSegments,
      mostRiddenSegments,
    });
  } catch (error) {
    console.error("Segments API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij het ophalen van segmenten." },
      { status: 500 }
    );
  }
}
