import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_PR_SEGMENTS_SHOWN = 8;

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

    const segmentIds = Array.from(
      new Set((efforts || []).map((effort) => effort.segment_id).filter(Boolean))
    );

    const { data: segmentDetailRows } = segmentIds.length
      ? await supabaseAdmin
          .from("segments")
          .select(
            "segment_id, distance, average_grade, elevation_high, elevation_low, athlete_count, effort_count, star_count, city, country"
          )
          .in("segment_id", segmentIds)
      : { data: [] as any[] };

    const segmentDetailById = new Map(
      (segmentDetailRows || []).map((row) => [row.segment_id, row])
    );

    type SegmentAgg = {
      segmentId: number;
      name: string;
      attempts: number;
      bestElapsedSeconds: number;
      isPr: boolean;
      bestKomRank: number | null;
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
          bestKomRank: effort.kom_rank ?? null,
          lastRiddenDate: activity?.start_date ?? null,
        });
        continue;
      }

      existing.attempts += 1;
      existing.bestElapsedSeconds = Math.min(existing.bestElapsedSeconds, elapsed);
      existing.isPr = existing.isPr || effort.pr_rank === 1;

      if (effort.kom_rank && (!existing.bestKomRank || effort.kom_rank < existing.bestKomRank)) {
        existing.bestKomRank = effort.kom_rank;
      }

      if (
        activity?.start_date &&
        (!existing.lastRiddenDate || activity.start_date > existing.lastRiddenDate)
      ) {
        existing.lastRiddenDate = activity.start_date;
      }
    }

    function withDetail(segment: SegmentAgg) {
      const detail = segmentDetailById.get(segment.segmentId);

      return {
        ...segment,
        distanceKm: detail?.distance ? Math.round((detail.distance / 1000) * 10) / 10 : null,
        averageGrade: detail?.average_grade ?? null,
        elevationGainM:
          detail?.elevation_high != null && detail?.elevation_low != null
            ? Math.round(detail.elevation_high - detail.elevation_low)
            : null,
        // "Populariteit": hoeveel unieke Strava-gebruikers en pogingen dit
        // segment ooit heeft gehad. Een exacte ranglijstpositie/percentiel
        // t.o.v. alle Strava-gebruikers is met de huidige Strava-API-toegang
        // niet betrouwbaar op te vragen (die segment-leaderboard-endpoint is
        // voor de meeste apps afgeschermd) — vandaar athlete_count/effort_count
        // als beschikbare, betrouwbare populariteitsmaat.
        athleteCount: detail?.athlete_count ?? null,
        effortCount: detail?.effort_count ?? null,
        starCount: detail?.star_count ?? null,
        city: detail?.city ?? null,
        country: detail?.country ?? null,
      };
    }

    const allSegments = Array.from(bySegment.values()).map(withDetail);

    const prSegmentsAll = allSegments
      .filter((segment) => segment.isPr)
      .sort((a, b) => (b.athleteCount ?? 0) - (a.athleteCount ?? 0));

    const mostRiddenSegments = [...allSegments]
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 20);

    return NextResponse.json({
      totalSegments: allSegments.length,
      totalPrSegments: prSegmentsAll.length,
      prSegments: prSegmentsAll.slice(0, MAX_PR_SEGMENTS_SHOWN),
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
