import { NextRequest, NextResponse } from "next/server";
import { verifyStravaState } from "@/lib/strava/state";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state || !verifyStravaState(state)) {
    return NextResponse.redirect(
      new URL("/dashboard?strava=error", request.url)
    );
  }

  const dashboardUrl = new URL("/dashboard", request.url);

  dashboardUrl.searchParams.set("strava_code", code);
  dashboardUrl.searchParams.set("strava_state", state);

  return NextResponse.redirect(dashboardUrl);
}
