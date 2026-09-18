import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLevelFromXp } from "@/lib/xp/level";
import { calculateLongestStreak } from "@/lib/stats/longestStreak";
import { fetchAllSegmentEfforts } from "@/lib/segments/fetchAllSegmentEfforts";

const DUTCH_MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

const DUTCH_WEEKDAYS = [
  "zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag",
];

const EVEREST_HEIGHT_M = 8849;
const NETHERLANDS_LENGTH_KM = 300;

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

    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from("strava_activities")
      .select(
        "id, name, distance, moving_time, total_elevation_gain, average_speed, start_date, city, country, kudos_count, calories"
      )
      .eq("user_id", user.id)
      .in("activity_type", ["Ride", "GravelRide"])
      .order("start_date", { ascending: true });

    if (activitiesError) {
      console.error("Wrapped database error:", activitiesError);

      return NextResponse.json(
        { error: "Ritten konden niet worden opgehaald." },
        { status: 500 }
      );
    }

    const rides = activities || [];

    if (rides.length === 0) {
      return NextResponse.json({ hasData: false });
    }

    const totalDistance = rides.reduce((sum, r) => sum + (r.distance || 0), 0);
    const totalElevation = rides.reduce(
      (sum, r) => sum + (r.total_elevation_gain || 0),
      0
    );
    const totalMovingTime = rides.reduce(
      (sum, r) => sum + (r.moving_time || 0),
      0
    );

    const longestRide = rides.reduce(
      (best, r) => ((r.distance || 0) > (best.distance || 0) ? r : best),
      rides[0]
    );
    const biggestClimb = rides.reduce(
      (best, r) =>
        (r.total_elevation_gain || 0) > (best.total_elevation_gain || 0)
          ? r
          : best,
      rides[0]
    );
    const fastestRide = rides.reduce(
      (best, r) => ((r.average_speed || 0) > (best.average_speed || 0) ? r : best),
      rides[0]
    );

    const placeCounts = new Map<
      string,
      { count: number; city: string; country: string }
    >();

    for (const r of rides) {
      if (!r.city) {
        continue;
      }

      const key = `${r.city}|${r.country}`;
      const existing = placeCounts.get(key);

      if (existing) {
        existing.count++;
      } else {
        placeCounts.set(key, { count: 1, city: r.city, country: r.country });
      }
    }

    const favoritePlace =
      Array.from(placeCounts.values()).sort((a, b) => b.count - a.count)[0] ||
      null;
    const uniquePlaces = placeCounts.size;

    const monthTotals = new Map<string, number>();

    for (const r of rides) {
      if (!r.start_date) {
        continue;
      }

      const d = new Date(r.start_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthTotals.set(key, (monthTotals.get(key) || 0) + (r.distance || 0));
    }

    let bestMonthKey = "";
    let bestMonthDistance = 0;

    for (const [key, dist] of monthTotals.entries()) {
      if (dist > bestMonthDistance) {
        bestMonthDistance = dist;
        bestMonthKey = key;
      }
    }

    const bestMonth = bestMonthKey
      ? {
          name: DUTCH_MONTHS[Number(bestMonthKey.split("-")[1])],
          year: Number(bestMonthKey.split("-")[0]),
          distanceKm: Math.round((bestMonthDistance / 1000) * 10) / 10,
        }
      : null;

    const weekdayCounts = new Array(7).fill(0);

    for (const r of rides) {
      if (!r.start_date) {
        continue;
      }

      weekdayCounts[new Date(r.start_date).getDay()]++;
    }

    let bestWeekdayIndex = 0;

    for (let i = 1; i < 7; i++) {
      if (weekdayCounts[i] > weekdayCounts[bestWeekdayIndex]) {
        bestWeekdayIndex = i;
      }
    }

    const bestWeekday =
      weekdayCounts[bestWeekdayIndex] > 0
        ? DUTCH_WEEKDAYS[bestWeekdayIndex]
        : null;

    const longestStreak = calculateLongestStreak(
      rides.map((r) => r.start_date)
    );

    const { data: xpRows } = await supabaseAdmin
      .from("activity_xp")
      .select("total_xp")
      .eq("user_id", user.id);

    const totalXp = (xpRows || []).reduce(
      (sum, row) => sum + (row.total_xp || 0),
      0
    );
    const levelData = getLevelFromXp(totalXp);

    const { count: unlockedBadges } = await supabaseAdmin
      .from("user_badges")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: totalBadges } = await supabaseAdmin
      .from("badges")
      .select("id", { count: "exact", head: true });

    const { count: completedQuests } = await supabaseAdmin
      .from("user_quests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true);

    const { count: totalQuests } = await supabaseAdmin
      .from("quests")
      .select("id", { count: "exact", head: true });

    const activityIds = rides.map((r: any) => r.id);

    const { count: prCount } =
      activityIds.length > 0
        ? await supabaseAdmin
            .from("activity_segment_efforts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("pr_rank", 1)
        : { count: 0 };

    const totalKudos = rides.reduce((sum, r: any) => sum + (r.kudos_count || 0), 0);
    const totalCalories = rides.reduce((sum, r: any) => sum + (r.calories || 0), 0);
    const avgDistanceKm =
      rides.length > 0 ? Math.round((totalDistance / rides.length / 1000) * 10) / 10 : 0;

    let favoriteSegment: { name: string; count: number } | null = null;

    if (activityIds.length > 0) {
      // Gedeelde, gepagineerde helper (ook gebruikt door /api/segments) zodat
      // "hoe vaak gereden" hier nooit meer kan afwijken van de Segmenten-tab.
      const allEfforts = await fetchAllSegmentEfforts(supabaseAdmin, user.id);

      // Groeperen op segment_id, niet op naam: verschillende Strava-segmenten
      // delen soms dezelfde straatnaam (bv. een segment per rijrichting), en
      // zouden anders ten onrechte bij elkaar opgeteld worden.
      const segmentCounts = new Map<number, { name: string; count: number }>();

      for (const effort of allEfforts) {
        if (!effort.segment_id) {
          continue;
        }

        const existing = segmentCounts.get(effort.segment_id);

        if (existing) {
          existing.count += 1;
        } else {
          segmentCounts.set(effort.segment_id, {
            name: effort.segment_name || "Onbekend segment",
            count: 1,
          });
        }
      }

      const topSegment = Array.from(segmentCounts.values()).sort(
        (a, b) => b.count - a.count
      )[0];

      favoriteSegment = topSegment || null;
    }

    return NextResponse.json({
      hasData: true,
      totalRides: rides.length,
      totalDistanceKm: Math.round((totalDistance / 1000) * 10) / 10,
      totalElevationM: Math.round(totalElevation),
      totalMovingTimeHours: Math.round((totalMovingTime / 3600) * 10) / 10,
      longestRide: {
        name: longestRide.name,
        distanceKm: Math.round(((longestRide.distance || 0) / 1000) * 10) / 10,
        date: longestRide.start_date,
      },
      biggestClimb: {
        name: biggestClimb.name,
        elevationM: Math.round(biggestClimb.total_elevation_gain || 0),
        date: biggestClimb.start_date,
      },
      fastestRide: {
        name: fastestRide.name,
        speedKmh: Math.round((fastestRide.average_speed || 0) * 3.6 * 10) / 10,
        date: fastestRide.start_date,
      },
      favoritePlace,
      uniquePlaces,
      bestMonth,
      bestWeekday,
      longestStreak,
      level: levelData.level,
      totalXp: Math.round(totalXp),
      unlockedBadges: unlockedBadges || 0,
      totalBadges: totalBadges || 0,
      completedQuests: completedQuests || 0,
      totalQuests: totalQuests || 0,
      everestComparison: Math.round((totalElevation / EVEREST_HEIGHT_M) * 10) / 10,
      netherlandsComparison:
        Math.round((totalDistance / 1000 / NETHERLANDS_LENGTH_KM) * 10) / 10,
      prCount: prCount || 0,
      totalKudos: Math.round(totalKudos),
      totalCalories: Math.round(totalCalories),
      avgDistanceKm,
      favoriteSegment,
    });
  } catch (error) {
    console.error("Wrapped API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij het ophalen van Wrapped." },
      { status: 500 }
    );
  }
}
