import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchRoadGraph, nearestNode } from "@/lib/routes/osmGraph";
import { generatePointToPointRoute } from "@/lib/routes/routeGenerator";
import { haversineDistanceMeters } from "@/lib/routes/haversine";

export const maxDuration = 30;

// Begrensd zodat de Overpass-query behapbaar blijft, net als bij
// /api/routes/generate — zie de eerdere Overpass-stabiliteitsproblemen.
const MAX_SNAP_RADIUS_M = 9000;

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
    const from = body.from;
    const to = body.to;

    if (
      !from ||
      !to ||
      typeof from.lat !== "number" ||
      typeof from.lng !== "number" ||
      typeof to.lat !== "number" ||
      typeof to.lng !== "number"
    ) {
      return NextResponse.json(
        { error: "Ongeldige punten ontvangen." },
        { status: 400 }
      );
    }

    const directDistanceM = haversineDistanceMeters(
      from.lat,
      from.lng,
      to.lat,
      to.lng
    );

    const neededRadius = directDistanceM / 2 + 800;

    if (neededRadius > MAX_SNAP_RADIUS_M) {
      return NextResponse.json(
        {
          error: `Deze twee punten liggen te ver uit elkaar om automatisch te verbinden (max ongeveer ${Math.round(
            (MAX_SNAP_RADIUS_M * 2) / 1000
          )} km hemelsbreed). Plaats een tussenpunt.`,
        },
        { status: 400 }
      );
    }

    const centerLat = (from.lat + to.lat) / 2;
    const centerLng = (from.lng + to.lng) / 2;
    const radiusMeters = Math.max(600, neededRadius);

    const graph = await fetchRoadGraph(centerLat, centerLng, radiusMeters);

    if (graph.nodes.size === 0) {
      return NextResponse.json(
        { error: "Geen wegen gevonden rond dit gebied." },
        { status: 404 }
      );
    }

    const startNode = nearestNode(graph, from.lat, from.lng);
    const endNode = nearestNode(graph, to.lat, to.lng);

    if (!startNode || !endNode) {
      return NextResponse.json(
        { error: "Geen bruikbaar punt gevonden op het wegennet." },
        { status: 404 }
      );
    }

    const result = generatePointToPointRoute(graph, startNode.id, endNode.id);

    if (!result || result.points.length < 2) {
      return NextResponse.json(
        { error: "Geen route gevonden tussen deze twee punten." },
        { status: 422 }
      );
    }

    return NextResponse.json({ points: result.points, highways: result.highways });
  } catch (error) {
    console.error("Route-snap error:", error);

    const detail =
      error instanceof Error && error.message
        ? error.message
        : "Onbekende fout.";

    return NextResponse.json(
      { error: `Verbinden mislukt: ${detail}` },
      { status: 500 }
    );
  }
}
