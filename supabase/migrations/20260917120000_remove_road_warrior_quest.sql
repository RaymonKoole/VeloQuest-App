-- Verwijdert de "Road warrior" quest (uitgegrijsd/locked, thematisch vervangen door "IJzeren wielrenner").
-- Eerst user_quests-rijen verwijderen i.v.m. de foreign key naar quests.id.

delete from public.user_quests
where quest_id = (select id from public.quests where name = 'Road warrior');

delete from public.quests
where name = 'Road warrior';
