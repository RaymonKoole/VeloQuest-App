import { createClient } from "@supabase/supabase-js";
import { refreshStravaToken } from "@/lib/strava/exchange";

export async function getValidStravaAccessToken(userId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: account, error } = await supabaseAdmin
    .from("strava_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Strava-account kon niet worden gevonden.");
  }

  if (!account) {
    return null;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (account.expires_at > nowInSeconds + 60) {
    return account.access_token as string;
  }

  let refreshed;

  try {
    refreshed = await refreshStravaToken(account.refresh_token);
  } catch (refreshError) {
    console.error("Strava-token vernieuwen mislukt:", refreshError);
    return null;
  }

  const { error: updateError } = await supabaseAdmin
    .from("strava_accounts")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Ververste Strava-token kon niet worden opgeslagen:", updateError);
  }

  return refreshed.access_token as string;
}
