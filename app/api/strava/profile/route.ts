import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidStravaAccessToken } from "@/lib/strava/getAccessToken";

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

    let stravaAccessToken: string | null;

    try {
      stravaAccessToken = await getValidStravaAccessToken(user.id);
    } catch (tokenError) {
      console.error("Strava account error:", tokenError);

      return NextResponse.json(
        { error: "Strava-account kon niet worden gevonden." },
        { status: 500 }
      );
    }

    if (!stravaAccessToken) {
      return NextResponse.json(
        { error: "Geen Strava-account gekoppeld." },
        { status: 404 }
      );
    }

    const response = await fetch(
      "https://www.strava.com/api/v3/athlete",
      {
        headers: {
          Authorization: `Bearer ${stravaAccessToken}`,
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
