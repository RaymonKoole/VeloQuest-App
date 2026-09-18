-- Los van "heeft deze activiteit al route-data (streams)" bijhouden of we de
-- activiteit-detail (kudos/calories/foto) al hebben opgehaald. Zonder deze
-- vlag zou de foto-URL van al eerder verrijkte ritten (van vóór photo_url
-- bestond) nooit met terugwerkende kracht gevuld worden.
alter table public.strava_activities
  add column if not exists photo_checked_at timestamptz;
