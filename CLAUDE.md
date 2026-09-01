@AGENTS.md

# VeloQuest — Claude Code Instructions

## Project

VeloQuest is een gamified cycling app gebouwd met Next.js (App Router), Supabase en Strava.

Structuur van de repo:

- `app/` — pagina's (App Router). Bestaande pagina's: `page.tsx` (landing), `login/`, `register/`, `dashboard/`, `quests/`, `skills/`, `achievements/`, `activities/`.
- `app/api/` — API routes: `activities/`, `badges/`, `quests/`, `skills/`, `stats/`, `xp/`, `strava/` (`auth`, `callback`, `connect`, `profile`, `sync`, `activities`).
- `lib/` — gedeelde logica: `xp/level.ts` (account-XP → level), `progression/skillLevel.ts` (skill-XP → level, centrale helper), `quests/calculateQuests.ts`, `skills/calculateSkills.ts`, `badges/checkBadges.ts`, `strava/exchange.ts` (token exchange), `strava/state.ts` (signed OAuth state).
- `middleware.ts` — ververst de Supabase-sessie op `/dashboard/*` en `/api/*`.
- Supabase-clients staan verspreid over `lib/supabase.ts`, `lib/supabase-server.ts`, `lib/supabase-server-client.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`. Maak hier geen nieuw(e) los(se) client-bestand(en) bovenop; hergebruik een bestaande tenzij ik vraag dit op te ruimen.

De belangrijkste onderdelen zijn:

- **Dashboard/Home** (`app/dashboard/page.tsx`): overzicht van de belangrijkste voortgang en statistieken.
- **Quests** (`app/quests/page.tsx`, `app/api/quests/route.ts`, `lib/quests/calculateQuests.ts`): progression challenges met progressie, XP, tiers en prerequisites.
- **Skills** (`app/skills/page.tsx`, `app/api/skills/route.ts`, `lib/skills/calculateSkills.ts`): langdurige ontwikkeling van fietsvaardigheden en XP/levels.
- **Achievements/Badges** (`app/achievements/page.tsx`, `app/api/badges/route.ts`, `lib/badges/checkBadges.ts`): zelfstandige, collectible accomplishments.
- **Activities** (`app/activities/page.tsx`, `app/api/activities/route.ts`, `app/api/strava/*`): daadwerkelijke fietsactiviteiten afkomstig van Strava.
- **Routes**: toekomstige aparte functionaliteit voor het genereren/ontdekken van fietsroutes. Bestaat nog niet (`app/routes` ontbreekt), maar de navigatie in bestaande pagina's linkt er al wel naartoe.
- **Wrapped**: toekomstige aparte Spotify Wrapped-achtige samenvatting van fietsactiviteiten. Bestaat nog niet (`app/wrapped` ontbreekt), maar de navigatie in bestaande pagina's linkt er al wel naartoe.

## Productregels

### Quests
Quests zijn progression challenges (`lib/quests/calculateQuests.ts`, tabellen `quests`/`user_quests`).

Ze kunnen:
- progressie hebben
- XP geven
- tiers hebben
- prerequisites hebben (`prerequisite_quest_id`)
- locked, in progress of completed zijn

Quests en Achievements/Badges zijn twee verschillende systemen.

### Achievements / Badges
Achievements zijn onafhankelijk van Quests (`lib/badges/checkBadges.ts`, tabellen `badges`/`user_badges`).

Een Achievement/Badge is een collectible accomplishment en is geen quest reward.

Koppel Achievements niet automatisch aan het voltooien van Quests tenzij ik daar expliciet om vraag.

### Skills
Skills vertegenwoordigen langdurige ontwikkeling (`lib/skills/calculateSkills.ts`, tabellen `skills`/`user_skills`).

Skills moeten niet simpelweg een kopie worden van Quests of Achievements.

Gebruik bestaande gedeelde progression-logica wanneer die al bestaat. `lib/progression/skillLevel.ts` is de centrale helper voor skill-levels en `lib/xp/level.ts` de centrale helper voor account-level; maak geen tweede levelberekening als er al een centrale helper bestaat.

### Activities
Activities zijn daadwerkelijke Strava-activiteiten (`app/api/activities/route.ts` leest opgeslagen data; `app/api/strava/*` praat met de Strava-API).

Gebruik Activities als bron voor relevante fietsstatistieken en progression wanneer dat logisch is.

### Dashboard
Home/Dashboard (`app/dashboard/page.tsx`) moet relatief schoon blijven.

Stop niet automatisch alle nieuwe functionaliteit op de Home-pagina.

Grotere systemen mogen hun eigen pagina krijgen.

### Routes en Wrapped
Routes en Wrapped zijn aparte toekomstige features.

Maak deze niet alvast onderdeel van andere systemen zonder dat ik daar expliciet om vraag.

---

# Development workflow

## Algemene regel

Werk altijd in kleine, gecontroleerde stappen.

Voordat je code verandert:
1. begrijp eerst de bestaande implementatie
2. identificeer welke bestanden daadwerkelijk nodig zijn
3. leg kort uit wat je gaat veranderen
4. wacht op mijn toestemming als de wijziging groter is dan de opdracht duidelijk vereist

## Bestaande code respecteren

- Hergebruik bestaande helpers en logica waar mogelijk (bijv. `lib/xp/level.ts`, `lib/progression/skillLevel.ts`).
- Maak geen dubbele implementaties van bestaande functionaliteit.
- Verwijder geen werkende functionaliteit zonder expliciete reden.
- Verander geen architectuur alleen om code "mooier" te maken.
- Vermijd onnodige refactors.
- Behoud bestaande productbeslissingen.

## Builds

Na iedere codewijziging moet:

```
npm run build
```

worden uitgevoerd.

Als de build faalt:
- stop
- analyseer de fout
- los de fout op
- voer `npm run build` opnieuw uit

Ga niet verder met nieuwe functionaliteit zolang de build niet groen is.

## Git

Commit nooit automatisch na iedere wijziging.

Push nooit automatisch na iedere wijziging.

De normale workflow is:

1. wijziging maken
2. `npm run build`
3. build moet groen zijn
4. wijzigingen controleren
5. wachten op expliciete toestemming van mij
6. `git add`
7. `git commit` met een duidelijke korte commit message
8. `git push`

Als ik zeg:

"publiceer"

of:

"commit en push"

dan mag je de huidige gecontroleerde wijzigingen committen en pushen.

Voordat je commit:
- controleer `git status`
- controleer welke bestanden gewijzigd zijn
- commit alleen wijzigingen die bij de huidige taak horen

## Git branches

Werk op de branch die Claude Code voor de huidige taak gebruikt.

Push niet naar een andere branch zonder dat ik dat vraag.

## Secrets

Zet nooit secrets, API keys, tokens, passwords of private credentials in code, commits of CLAUDE.md.

Gebruik environment variables.

De bekende environment variables van VeloQuest zijn onder andere:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
```

De daadwerkelijke waarden mogen nooit in code of commits terechtkomen.

## Security

Besteed extra aandacht aan:
- Supabase authentication
- Supabase authorization/RLS
- Strava OAuth (`app/api/strava/auth`, `app/api/strava/callback`, `app/api/strava/connect`)
- OAuth state/CSRF bescherming (`lib/strava/state.ts` bestaat als signed-state helper; controleer of hij daadwerkelijk gebruikt wordt voordat je aanneemt dat de callback beschermd is)
- access tokens en refresh tokens (Strava-tokens worden nu niet automatisch ververst — houd hier rekening mee)
- server-side secrets

Gebruik nooit een `user_id` die blind door de client wordt aangeleverd als basis voor autorisatie.

Verifieer de ingelogde gebruiker server-side (zoals de bestaande API routes al doen via `supabase.auth.getUser(accessToken)` vóór gebruik van de service-role client).

## Communication style

Geef bij technische wijzigingen eerst kort:
- wat je hebt gevonden
- wat je gaat veranderen
- welke bestanden je verwacht te wijzigen

Voer daarna de wijziging uit.

Na afloop rapporteer:
- gewijzigde bestanden
- wat er is veranderd
- build-resultaat
- eventuele resterende aandachtspunten

Maak geen grote hoeveelheid ongevraagde wijzigingen.

## Important

Als mijn opdracht onduidelijk is:
- analyseer eerst
- stel alleen de noodzakelijke vraag
- verander nog niets

Als mijn opdracht duidelijk is:
- voer alleen de gevraagde wijziging uit
- blijf binnen de bestaande architectuur
- respecteer bovenstaande product- en Git-regels
