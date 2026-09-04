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

      const message =
        tokenError instanceof Error && tokenError.message
          ? tokenError.message
          : "Strava-account kon niet worden gevonden.";

      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (!stravaAccessToken) {
      return NextResponse.json(
        { error: "Geen Strava-account gekoppeld." },
        { status: 404 }
      );
    }

    const allActivities = [];
let page = 1;

while (true) {
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${stravaAccessToken}`,
      },
    }
  );

  const activities = await response.json();

  if (!response.ok) {
    console.error("Strava activities error:", activities);

    return NextResponse.json(
      { error: "Strava-activiteiten konden niet worden opgehaald." },
      { status: response.status }
    );
  }

  if (!Array.isArray(activities) || activities.length === 0) {
    break;
  }

  allActivities.push(...activities);

  if (activities.length < 100) {
    break;
  }

  page++;
}

return NextResponse.json({
  activities: allActivities,
  count: allActivities.length,
});
  } catch (error) {
    console.error("Strava activities error:", error);

    return NextResponse.json(
      { error: "Onbekende fout bij ophalen van activiteiten." },
      { status: 500 }
    );
  }
}
