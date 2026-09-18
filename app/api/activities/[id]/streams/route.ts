import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activityId = Number(id);

    if (!Number.isFinite(activityId)) {
      return NextResponse.json(
        { error: "Ongeldig activiteit-id." },
        { status: 400 }
      );
    }

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

    // Scope altijd op de ingelogde gebruiker — nooit alleen op het door de
    // client aangeleverde activity-id vertrouwen voor autorisatie.
    const { data: stream, error: streamError } = await supabaseAdmin
      .from("activity_streams")
      .select("altitude, latlng")
      .eq("activity_id", activityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (streamError) {
      console.error("Activity streams database error:", streamError);

      return NextResponse.json(
        { error: "Hoogteprofiel kon niet worden opgehaald." },
        { status: 500 }
      );
    }

    if (!stream || !stream.altitude) {
      return NextResponse.json(
        { error: "Geen hoogtedata beschikbaar voor deze rit." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      altitude: stream.altitude,
      latlng: stream.latlng,
    });
  } catch (error) {
    console.error("Activity streams API error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij het ophalen van hoogtedata." },
      { status: 500 }
    );
  }
}
