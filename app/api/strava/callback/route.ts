import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/strava/exchange";
import { createSupabaseServerClient } from "@/lib/supabase-server-client";

export async function GET(request: NextRequest) {
  console.log("Cookies:", request.cookies.getAll());
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Geen authorisatiecode ontvangen." },
      { status: 400 }
    );
  }

  const data = await exchangeCodeForToken(code);

  await supabase.from("strava_accounts").upsert({
  user_id: user.id,
  athlete_id: data.athlete.id,
  access_token: data.access_token,
  refresh_token: data.refresh_token,
  expires_at: data.expires_at,
});

return NextResponse.redirect(new URL("/dashboard", request.url));
}