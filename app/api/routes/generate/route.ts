import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { forwardGeocode } from "@/lib/geocode/forwardGeocode";
import { fetchRoadGraph, nearestNode } from "@/lib/routes/osmGraph";
import { markRiddenEdges, generateLoopRoute, densifyPoints } from "@/lib/routes/routeGenerator";
import { decodePolyline } from "@/lib/routes/decodePolyline";
import { haversineDistanceMeters } from "@/lib/routes/haversine";

export const maxDuration = 30;

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
    const startAddress = typeof body.startAddress === "string" ? body.startAddress.trim() : "";
    const distanceKm = Number(body.distanceKm);
    const desiredNewKm = body.desiredNewKm !== undefined && body.desiredNewKm !== ""
      ? Number(body.desiredNewKm)
      : null;
    const direction = typeof body.direction === "string" ? body.direction : "";

    if (!startAddress) {
      return NextResponse.json(
        { error: "Geen startadres ontvangen." },
        { status: 400 }
      );
    }

    if (!distanceKm || distanceKm < 1 || distanceKm > 150) {
      return NextResponse.json(
        { error: "Geef een geldige afstand op (1-150 km)." },
        { status: 400 }
      );
    }

    if (desiredNewKm !== null && (Number.isNaN(desiredNewKm) || desiredNewKm < 0)) {
      return NextResponse.json(
        { error: "Geef een geldig aantal nieuwe km op." },
        { status: 400 }
      );
    }

    const DIRECTION_BEARINGS: Record<string, number> = {
      N: 0,
      NO: 45,
      O: 90,
      ZO: 135,
      Z: 180,
      ZW: 225,
      W: 270,
      NW: 315,
    };

    const targetBearingDeg = DIRECTION_BEARINGS[direction];

    // Neutral default is roughly half the route being "new"; scale the novelty
    // weight up or down from there based on what the user asked for.
    const noveltyWeight =
      desiredNewKm !== null
        ? Math.min(2000, Math.max(50, 400 * (desiredNewKm / (distanceKm * 0.5))))
        : 400;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: knownActivities } = await supabaseAdmin
      .from("strava_activities")
      .select("city, country")
      .eq("user_id", user.id)
      .not("city", "is", null);

    const cityCounts = new Map<string, number>();

    for (const activity of knownActivities || []) {
      const key = `${activity.city}, ${activity.country}`;
      cityCounts.set(key, (cityCounts.get(key) || 0) + 1);
    }

    const mostCommonPlace = Array.from(cityCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    const geocodeQuery =
      startAddress.includes(",") || !mostCommonPlace
        ? startAddress
        : `${startAddress}, ${mostCommonPlace}`;

    const geocoded = await forwardGeocode(geocodeQuery);

    if (!geocoded) {
      return NextResponse.json(
        { error: "Startadres kon niet worden gevonden. Probeer het specifieker (bijv. met plaatsnaam)." },
        { status: 404 }
      );
    }

    const radiusMeters = Math.min(
      8000,
      Math.max(1500, distanceKm * 1000 * 0.35)
    );

    const graph = await fetchRoadGraph(
      geocoded.lat,
      geocoded.lng,
      radiusMeters
    );

    if (graph.nodes.size === 0) {
      return NextResponse.json(
        { error: "Geen wegen gevonden rond dit startpunt." },
        { status: 404 }
      );
    }

    const { data: rideActivities } = await supabaseAdmin
      .from("strava_activities")
      .select("start_lat, start_lng, summary_polyline")
      .eq("user_id", user.id)
      .in("activity_type", ["Ride", "GravelRide"])
      .not("start_lat", "is", null)
      .not("summary_polyline", "is", null);

    const riddenPoints: { lat: number; lng: number }[] = [];
    const bufferMeters = radiusMeters + 5000;

    for (const activity of rideActivities || []) {
      if (
        haversineDistanceMeters(
          geocoded.lat,
          geocoded.lng,
          activity.start_lat,
          activity.start_lng
        ) > bufferMeters
      ) {
        continue;
      }

      const points = densifyPoints(decodePolyline(activity.summary_polyline));

      for (const [lat, lng] of points) {
        riddenPoints.push({ lat, lng });
      }
    }

    markRiddenEdges(graph, riddenPoints);

    const startNode = nearestNode(graph, geocoded.lat, geocoded.lng);

    if (!startNode) {
      return NextResponse.json(
        { error: "Geen bruikbaar startpunt gevonden op het wegennet." },
        { status: 404 }
      );
    }

    const result = generateLoopRoute(graph, startNode.id, distanceKm * 1000, {
      noveltyWeight,
      targetBearingDeg,
    });

    if (result.points.length < 2) {
      return NextResponse.json(
        { error: "Kon geen route genereren rond dit startpunt. Probeer een ander adres of een andere afstand." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      points: result.points,
      distanceKm: Math.round((result.distanceM / 1000) * 10) / 10,
      newKm: Math.round((result.newM / 1000) * 10) / 10,
      riddenKm: Math.round((result.riddenM / 1000) * 10) / 10,
      startDisplayName: geocoded.displayName,
    });
  } catch (error) {
    console.error("Route generatie error:", error);

    const detail =
      error instanceof Error && error.message
        ? error.message
        : "Onbekende fout.";

    return NextResponse.json(
      { error: `Route genereren is mislukt: ${detail}` },
      { status: 500 }
    );
  }
}
