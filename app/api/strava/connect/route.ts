import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { exchangeCodeForToken } from "@/lib/strava/exchange";

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
    const code = body.code;

    if (!code) {
      return NextResponse.json(
        { error: "Geen Strava-code ontvangen." },
        { status: 400 }
      );
    }

    const data = await exchangeCodeForToken(code);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: databaseError } = await supabaseAdmin
      .from("strava_accounts")
      .upsert(
        {
          user_id: user.id,
          athlete_id: data.athlete.id,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
        },
        {
          onConflict: "user_id",
        }
      );

    if (databaseError) {
      console.error("Strava database error:", databaseError);

      return NextResponse.json(
        { error: "Strava-account kon niet worden opgeslagen." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Strava connect error:", error);

    return NextResponse.json(
      { error: "Strava koppelen is mislukt." },
      { status: 500 }
    );
  }
}
