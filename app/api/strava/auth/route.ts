import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server-client";
import { createStravaState } from "@/lib/strava/state";

export async function GET(request: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "STRAVA_CLIENT_ID ontbreekt." },
      { status: 500 }
    );
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = createStravaState(user.id);

  const redirectUri =
    "https://veloquest-app.vercel.app/api/strava/callback";

  const url =
    `https://www.strava.com/oauth/authorize` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&approval_prompt=force` +
    `&scope=read,activity:read_all` +
    `&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(url);
}
