import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { forwardGeocode } from "@/lib/geocode/forwardGeocode";
import { fetchRoadGraph, nearestNode } from "@/lib/routes/osmGraph";
import {
  markRiddenEdges,
  generateLoopRoute,
  generatePointToPointRoute,
  densifyPoints,
} from "@/lib/routes/routeGenerator";
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
    const endAddress = typeof body.endAddress === "string" ? body.endAddress.trim() : "";
    const isPointToPoint = endAddress.length > 0;
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

    // Bij een rondje (start = eindpunt) bepaalt de gevraagde afstand hoe lang
    // de lus wordt; bij een route van A naar B is de afstand een gevolg van
    // de kortste-pad-berekening en niet nodig als invoer.
    if (!isPointToPoint && (!distanceKm || distanceKm < 1 || distanceKm > 150)) {
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
    // weight up or down from there based on what the user asked for. Alleen
    // relevant voor de rondje-modus — de van-A-naar-B-modus gebruikt een eigen,
    // simpelere noveltyWeight-fractie (zie generatePointToPointRoute).
    const noveltyWeight =
      !isPointToPoint && desiredNewKm !== null
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

    function withCityBias(address: string) {
      return address.includes(",") || !mostCommonPlace
        ? address
        : `${address}, ${mostCommonPlace}`;
    }

    const geocoded = await forwardGeocode(withCityBias(startAddress));

    if (!geocoded) {
      return NextResponse.json(
        { error: "Startadres kon niet worden gevonden. Probeer het specifieker (bijv. met plaatsnaam)." },
        { status: 404 }
      );
    }

    let endGeocoded: Awaited<ReturnType<typeof forwardGeocode>> = null;

    if (isPointToPoint) {
      endGeocoded = await forwardGeocode(withCityBias(endAddress));

      if (!endGeocoded) {
        return NextResponse.json(
          { error: "Eindadres kon niet worden gevonden. Probeer het specifieker (bijv. met plaatsnaam)." },
          { status: 404 }
        );
      }
    }

    let centerLat = geocoded.lat;
    let centerLng = geocoded.lng;
    let radiusMeters: number;

    if (isPointToPoint && endGeocoded) {
      const directDistanceM = haversineDistanceMeters(
        geocoded.lat,
        geocoded.lng,
        endGeocoded.lat,
        endGeocoded.lng
      );

      // Begrensd zodat de Overpass-query behapbaar blijft (zie de eerdere
      // Overpass-stabiliteitsproblemen dit seizoen).
      const MAX_POINT_TO_POINT_RADIUS_M = 12000;
      const neededRadius = directDistanceM / 2 + 1500;

      if (neededRadius > MAX_POINT_TO_POINT_RADIUS_M) {
        return NextResponse.json(
          {
            error: `Start- en eindadres liggen te ver uit elkaar voor deze functie (max ongeveer ${Math.round(
              (MAX_POINT_TO_POINT_RADIUS_M * 2) / 1000
            )} km hemelsbreed).`,
          },
          { status: 400 }
        );
      }

      centerLat = (geocoded.lat + endGeocoded.lat) / 2;
      centerLng = (geocoded.lng + endGeocoded.lng) / 2;
      radiusMeters = Math.max(1500, neededRadius);
    } else {
      radiusMeters = Math.min(8000, Math.max(1500, distanceKm * 1000 * 0.35));
    }

    const graph = await fetchRoadGraph(centerLat, centerLng, radiusMeters);

    if (graph.nodes.size === 0) {
      return NextResponse.json(
        { error: "Geen wegen gevonden rond dit gebied." },
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
          centerLat,
          centerLng,
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

    let result: {
      points: [number, number][];
      distanceM: number;
      riddenM: number;
      newM: number;
    } | null;

    if (isPointToPoint && endGeocoded) {
      const endNode = nearestNode(graph, endGeocoded.lat, endGeocoded.lng);

      if (!endNode) {
        return NextResponse.json(
          { error: "Geen bruikbaar eindpunt gevonden op het wegennet." },
          { status: 404 }
        );
      }

      result = generatePointToPointRoute(graph, startNode.id, endNode.id, {
        noveltyWeight: 0.35,
      });

      if (!result) {
        return NextResponse.json(
          { error: "Geen route gevonden tussen start- en eindadres. Probeer andere adressen." },
          { status: 422 }
        );
      }
    } else {
      result = generateLoopRoute(graph, startNode.id, distanceKm * 1000, {
        noveltyWeight,
        targetBearingDeg,
      });
    }

    if (result.points.length < 2) {
      return NextResponse.json(
        { error: "Kon geen route genereren. Probeer een ander adres of een andere afstand." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      points: result.points,
      distanceKm: Math.round((result.distanceM / 1000) * 10) / 10,
      newKm: Math.round((result.newM / 1000) * 10) / 10,
      riddenKm: Math.round((result.riddenM / 1000) * 10) / 10,
      startDisplayName: geocoded.displayName,
      endDisplayName: endGeocoded?.displayName ?? null,
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
