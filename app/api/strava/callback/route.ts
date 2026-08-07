import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/strava/exchange";
import { verifyStravaState } from "@/lib/strava/state";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard?strava=error", request.url)
    );
  }

  const userId = verifyStravaState(state);

  if (!userId) {
    return NextResponse.redirect(
      new URL("/dashboard?strava=invalid_state", request.url)
    );
  }

  try {
    const data = await exchangeCodeForToken(code);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from("strava_accounts")
      .upsert(
        {
          user_id: userId,
          athlete_id: data.athlete.id,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      console.error("Strava database error:", error);

      return NextResponse.redirect(
        new URL("/dashboard?strava=database_error", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/dashboard?strava=connected", request.url)
    );
  } catch (error) {
    console.error("Strava callback error:", error);

    return NextResponse.redirect(
      new URL("/dashboard?strava=error", request.url)
    );
  }
}
