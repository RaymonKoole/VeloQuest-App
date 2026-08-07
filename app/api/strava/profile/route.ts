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

    const { data: stravaAccount, error: databaseError } =
      await supabaseAdmin
        .from("strava_accounts")
        .select(
          "athlete_id, access_token, refresh_token, expires_at"
        )
        .eq("user_id", user.id)
        .maybeSingle();

    if (databaseError) {
      console.error("Strava account error:", databaseError);

      return NextResponse.json(
        { error: "Strava-account kon niet worden gevonden." },
        { status: 500 }
      );
    }

    if (!stravaAccount) {
      return NextResponse.json(
        { error: "Geen Strava-account gekoppeld." },
        { status: 404 }
      );
    }

    const response = await fetch(
      "https://www.strava.com/api/v3/athlete",
      {
        headers: {
          Authorization: `Bearer ${stravaAccount.access_token}`,
        },
      }
    );

    const athlete = await response.json();

    if (!response.ok) {
      console.error("Strava API error:", athlete);

      return NextResponse.json(
        { error: "Strava-profiel kon niet worden opgehaald." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      athlete,
    });
  } catch (error) {
    console.error("Strava profile error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij ophalen Strava-profiel." },
      { status: 500 }
    );
  }
}
