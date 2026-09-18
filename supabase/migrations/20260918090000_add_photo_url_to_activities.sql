-- Voegt een kolom toe voor de hoofdfoto van een Strava-activiteit (indien aanwezig),
-- zodat we die kunnen tonen zonder bij elke paginaweergave opnieuw bij Strava op te halen.
alter table public.strava_activities
  add column if not exists photo_url text;
