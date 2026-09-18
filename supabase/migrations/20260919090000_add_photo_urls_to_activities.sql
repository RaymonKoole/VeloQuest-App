-- Strava's activiteit-detail geeft alleen één "primary" foto terug (al opgeslagen
-- in photo_url). Voor alle foto's van een activiteit is een aparte Strava-aanroep
-- nodig (/activities/{id}/photos); die lijst slaan we hier op.
alter table public.strava_activities
  add column if not exists photo_urls text[];
