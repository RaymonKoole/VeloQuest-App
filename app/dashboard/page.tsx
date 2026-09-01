"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSkillProgress } from "@/lib/progression/skillLevel";

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [stravaAthlete, setStravaAthlete] = useState<any>(null);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [badges, setBadges] = useState<any[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [skills, setSkills] = useState<any[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [quests, setQuests] = useState<any[]>([]);
  const [questsLoading, setQuestsLoading] = useState(true);
  const [xpData, setXpData] = useState<any>(null);
  const [xpLoading, setXpLoading] = useState(true);
  async function loadDashboardData(accessToken: string) {
    const badgesResponse = await fetch("/api/badges", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (badgesResponse.ok) {
      const badgesData = await badgesResponse.json();
      setBadges(badgesData.badges);
    }

    setBadgesLoading(false);

    const activitiesResponse = await fetch("/api/activities", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (activitiesResponse.ok) {
      const activitiesData = await activitiesResponse.json();
      setActivities(activitiesData.activities);
    }

    setActivitiesLoading(false);

    const skillsResponse = await fetch("/api/skills", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (skillsResponse.ok) {
      const skillsData = await skillsResponse.json();
      setSkills(skillsData.skills);
    }

    setSkillsLoading(false);

    const questsResponse = await fetch("/api/quests", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (questsResponse.ok) {
      const questsData = await questsResponse.json();
      setQuests(questsData.quests);
    }

    setQuestsLoading(false);

    const xpResponse = await fetch("/api/xp", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (xpResponse.ok) {
      const xpData = await xpResponse.json();
      setXpData(xpData);
    }

    setXpLoading(false);

    const statsResponse = await fetch("/api/stats", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      setStats(statsData);
    }

    setStatsLoading(false);
  }

  async function handleStravaSync() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const response = await fetch("/api/strava/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Synchroniseren mislukt.");
      return;
    }

    await loadDashboardData(session.access_token);

    alert(`Synchronisatie klaar! ${data.imported} activiteiten verwerkt.`);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      if (session.user.user_metadata.full_name) {
        setUserName(session.user.user_metadata.full_name);
      }

      const params = new URLSearchParams(window.location.search);
      const stravaCode = params.get("strava_code");
      const stravaState = params.get("strava_state");

      if (stravaCode) {
        const connectResponse = await fetch("/api/strava/connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            code: stravaCode,
            state: stravaState,
          }),
        });

        if (connectResponse.ok) {
          window.history.replaceState({}, "", "/dashboard");
        } else {
          console.error("Strava koppelen mislukt:", await connectResponse.text());
        }
      }

      const profileResponse = await fetch("/api/strava/profile", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setStravaAthlete(profileData.athlete);

        const syncResponse = await fetch("/api/strava/sync", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!syncResponse.ok) {
          console.error(
            "Automatische Strava-sync mislukt:",
            await syncResponse.text()
          );
        }
      }

      await loadDashboardData(session.access_token);
    }

    checkUser();
  }, [router]);

          {/* Badges */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">
              🏅 Badges
            </h2>

            <p className="mt-2 text-neutral-400">
              Verdien nieuwe achievements.
            </p>
          </div>
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <nav className="mb-8 flex flex-wrap gap-2">
  <a
    href="/dashboard"
    className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white"
  >
    🏠 Home
  </a>

  <a
    href="/quests"
    className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
  >
    ⚔️ Quests
  </a>

  <a
    href="/skills"
    className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
  >
    🧬 Skills
  </a>

  <a
    href="/achievements"
    className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
  >
    🏆 Achievements
  </a>

  <a
    href="/activities"
    className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
  >
    🚴 Activities
  </a>

  <a
    href="/routes"
    className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
  >
    🗺️ Routes
  </a>

  <a
    href="/wrapped"
    className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
  >
    ✨ Wrapped
  </a>
</nav>
<div className="flex justify-end">
  <button
    onClick={handleLogout}
    className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition"
  >
    Uitloggen
  </button>
</div>
        <h1 className="text-4xl font-bold">
  Welkom{userName ? `, ${userName}` : ""}! 👋
</h1>

        <p className="mt-3 text-neutral-400">
          Je bent succesvol ingelogd.
        </p>
        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
  {xpLoading ? (
    <p className="text-neutral-400">
      XP laden...
    </p>
  ) : xpData ? (
    <>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-purple-400">
            Level {xpData.level}
          </p>

          <p className="mt-1 text-3xl font-bold">
            {xpData.totalXp.toLocaleString("nl-NL")} XP
          </p>
        </div>

        <p className="text-sm text-neutral-400">
          {xpData.xpIntoLevel} / {xpData.xpNeededForNextLevel} XP
        </p>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-purple-500 transition-all"
          style={{
            width: `${
              Math.min(
                100,
                (xpData.xpIntoLevel / xpData.xpNeededForNextLevel) * 100
              )
            }%`,
          }}
        />
      </div>

      <p className="mt-3 text-sm text-neutral-500">
        Nog{" "}
        {xpData.xpNeededForNextLevel - xpData.xpIntoLevel} XP
        {" "}tot Level {xpData.level + 1}
      </p>
    </>
  ) : (
    <p className="text-neutral-400">
      XP kon niet worden geladen.
    </p>
  )}
</div>
<div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
  <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
    <p className="text-sm text-neutral-400">
      Totale afstand
    </p>

    <p className="mt-2 text-3xl font-bold">
      {statsLoading
        ? "..."
        : `${((stats?.totalDistance || 0) / 1000).toFixed(1)} km`}
    </p>

    <p className="mt-2 text-sm text-neutral-500">
      Fietsritten
    </p>
  </div>

  <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
    <p className="text-sm text-neutral-400">
      Hoogtemeters
    </p>

    <p className="mt-2 text-3xl font-bold">
      {statsLoading
        ? "..."
        : `${Math.round(stats?.totalElevation || 0).toLocaleString("nl-NL")} m`}
    </p>

    <p className="mt-2 text-sm text-neutral-500">
      Totaal geklommen
    </p>
  </div>

  <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
    <p className="text-sm text-neutral-400">
      Aantal ritten
    </p>

    <p className="mt-2 text-3xl font-bold">
      {statsLoading
        ? "..."
        : (stats?.totalActivities || 0).toLocaleString("nl-NL")}
    </p>

    <p className="mt-2 text-sm text-neutral-500">
      Opgeslagen in VeloQuest
    </p>
  </div>

  <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
    <p className="text-sm text-neutral-400">
      Fietstijd
    </p>

    <p className="mt-2 text-3xl font-bold">
      {statsLoading
        ? "..."
        : `${Math.floor((stats?.totalMovingTime || 0) / 3600)} uur`}
    </p>

    <p className="mt-2 text-sm text-neutral-500">
      Totale beweegtijd
    </p>
  </div>
</div>
        {/* Strava / Badges / Routes / Profiel */}
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">

<div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 lg:col-span-2">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-xl font-semibold">
        ⚔️ Skills
      </h2>

      <p className="mt-2 text-sm text-neutral-400">
        Train je vaardigheden door te fietsen.
      </p>
    </div>
  </div>

  {skillsLoading ? (
    <p className="mt-6 text-sm text-neutral-400">
      Skills laden...
    </p>
  ) : (
    <div className="mt-6 space-y-5">
      {skills.map((skill) => {
        const skillProgress = getSkillProgress(skill.xp);


        return (
          <div key={skill.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {skill.icon}
                </span>

                <div>
                  <p className="font-semibold">
                    {skill.name}
                  </p>

                  <p className="text-xs text-neutral-500">
                    {skill.description}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-bold">
                  Level {skillProgress.level}
                </p>

                <p className="text-xs text-neutral-500">
  {Math.round(skill.xp).toLocaleString("nl-NL")} XP
</p>
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-purple-500 transition-all"
                style={{
                  width: `${skillProgress.progress}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-neutral-600">
  <span>
    {Math.round(skill.xp).toLocaleString("nl-NL")} XP
  </span>

  {skillProgress.level >= 99 ? (
    <span>🏆 Max Level</span>
  ) : (
    <span>
      {Math.ceil(skillProgress.xpToNextLevel).toLocaleString("nl-NL")} XP naar Level{" "}
      {skillProgress.level + 1}
    </span>
  )}
</div>
          </div>
        );
      })}
    </div>
  )}
</div>
<div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 lg:col-span-2">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-xl font-semibold">
        📜 Quests
      </h2>

      <p className="mt-2 text-sm text-neutral-400">
        Voltooi uitdagingen tijdens je fietsavonturen.
      </p>
    </div>

    <span className="text-sm text-neutral-500">
      {quests.filter((quest) => quest.completed).length}/
      {quests.length}
    </span>
  </div>

  {questsLoading ? (
    <p className="mt-6 text-sm text-neutral-400">
      Quests laden...
    </p>
  ) : quests.length === 0 ? (
    <p className="mt-6 text-sm text-neutral-400">
      Nog geen quests beschikbaar.
    </p>
  ) : (
    <div className="mt-6 space-y-4">
      {quests.map((quest) => {
  const progress = Math.min(
    100,
    (quest.progress / quest.requirement_value) * 100
  );

  const isLocked = quest.status === "locked";
  const isCompleted = quest.status === "completed";

  return (
    <div
      key={quest.id}
      className={`rounded-xl border p-4 ${
        isLocked
          ? "border-neutral-800 bg-neutral-950 opacity-50"
          : isCompleted
          ? "border-green-500/30 bg-green-500/5"
          : "border-neutral-800 bg-neutral-950"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">
            {isLocked ? "🔒" : quest.icon}
          </span>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">
                {quest.name}
              </h3>

              {isLocked ? (
                <span className="text-xs text-neutral-500">
                  🔒 Vergrendeld
                </span>
              ) : isCompleted ? (
                <span className="text-xs text-green-400">
                  ✓ Voltooid
                </span>
              ) : (
                <span className="text-xs text-purple-400">
                  ⚔️ In progress
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-neutral-500">
              {quest.description}
            </p>
          </div>
        </div>

        <div className="whitespace-nowrap text-right">
          <p className="text-sm font-semibold text-purple-400">
            +{quest.reward_xp} XP
          </p>

          {isCompleted && (
            <p className="mt-1 text-xs text-green-400">
              Quest voltooid
            </p>
          )}
        </div>
      </div>

      {!isLocked && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>
              {quest.requirement_type === "distance"
                ? `${Number(quest.progress).toFixed(1)} / ${quest.requirement_value} km`
                : quest.requirement_type === "elevation"
                ? `${Math.round(quest.progress)} / ${quest.requirement_value} hm`
                : quest.requirement_type === "moving_time"
                ? `${Math.floor(quest.progress / 3600)} / ${Math.floor(quest.requirement_value / 3600)} uur`
                : `${Math.round(quest.progress)} / ${quest.requirement_value}`}
            </span>

            <span>
              {Math.round(progress)}%
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all ${
                isCompleted
                  ? "bg-green-500"
                  : "bg-purple-500"
              }`}
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
})}
    </div>
  )}
</div>
          {/* Strava */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">
              🚴 Strava
            </h2>

            {stravaAthlete ? (
              <>
                <div className="mt-4 flex items-center gap-4">
                  {stravaAthlete.profile && (
                    <img
                      src={stravaAthlete.profile}
                      alt="Strava profiel"
                      className="h-14 w-14 rounded-full"
                    />
                  )}

                  <div>
                    <p className="font-semibold text-white">
                      {stravaAthlete.firstname} {stravaAthlete.lastname}
                    </p>

                    <p className="text-sm text-neutral-400">
                      Strava is gekoppeld ✓
                    </p>

                    <button
                      onClick={handleStravaSync}
                      className="mt-5 rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 transition"
                    >
                      Synchroniseer activiteiten
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-neutral-800 p-3">
                    <p className="text-sm text-neutral-400">
                      Stad
                    </p>

                    <p className="mt-1 font-semibold">
                      {stravaAthlete.city || "Onbekend"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-neutral-800 p-3">
                    <p className="text-sm text-neutral-400">
                      Land
                    </p>

                    <p className="mt-1 font-semibold">
                      {stravaAthlete.country || "Onbekend"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-neutral-400">
                  Koppel je Strava-account om ritten te synchroniseren.
                </p>

                <a
                  href="/api/strava/auth"
                  className="mt-5 inline-block rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 transition"
                >
                  Koppel met Strava
                </a>
              </>
            )}
          </div>

   {/* Badges */}       
<div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-xl font-semibold">
        🏅 Badges
      </h2>

      <p className="mt-2 text-sm text-neutral-400">
        Ontgrendel achievements tijdens je fietsavonturen.
      </p>
    </div>

    <span className="text-sm text-neutral-500">
      {badges.filter((badge) => badge.unlocked).length}/{badges.length}
    </span>
  </div>

  {badgesLoading ? (
    <p className="mt-6 text-sm text-neutral-400">
      Badges laden...
    </p>
  ) : (
    <div className="mt-6 grid grid-cols-2 gap-3">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className={`rounded-xl border p-4 transition ${
            badge.unlocked
              ? "border-purple-500/40 bg-purple-500/10"
              : "border-neutral-800 bg-neutral-950 opacity-50"
          }`}
        >
          <div className="text-3xl">
            {badge.icon}
          </div>

          <p className="mt-2 font-semibold">
            {badge.name}
          </p>

          <p className="mt-1 text-xs text-neutral-400">
            {badge.description}
          </p>

          {badge.unlocked ? (
            <p className="mt-3 text-xs font-semibold text-purple-400">
              ✓ Ontgrendeld
            </p>
          ) : (
            <p className="mt-3 text-xs text-neutral-500">
              🔒 Nog niet ontgrendeld
            </p>
          )}
        </div>
      ))}
    </div>
  )}
</div>

          {/* Routes */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">
              🗺️ Routes
            </h2>

            <p className="mt-2 text-neutral-400">
              Ontdek nieuwe routes.
            </p>
          </div>

          {/* Profiel */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">
              ⚙️ Profiel
            </h2>

            <p className="mt-2 text-neutral-400">
              Beheer jouw account.
            </p>
          </div>

        </div>

        {/* Recente ritten */}
        <div className="mt-10 w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                🚴 Recente ritten
              </h2>

              <p className="mt-2 text-neutral-400">
                Je Strava-activiteiten opgeslagen in VeloQuest.
              </p>
            </div>
          </div>

          {activitiesLoading ? (
            <p className="mt-6 text-neutral-400">
              Activiteiten laden...
            </p>
          ) : activities.length === 0 ? (
            <p className="mt-6 text-neutral-400">
              Nog geen activiteiten gevonden.
            </p>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-neutral-800">
              {activities.slice(0, 5).map((activity) => (
                <div
                  key={activity.strava_activity_id}
                  className="border-b border-neutral-800 px-4 py-4 last:border-b-0"
                >
                  <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] md:items-center">

                    <div>
                      <h3 className="font-semibold text-white">
                        {activity.name || "Naamloze rit"}
                      </h3>

                      <p className="mt-1 text-sm text-neutral-500">
                        {activity.activity_type || "Activiteit"}
                      </p>
                    </div>

                    <div className="text-sm text-neutral-300">
                      <span className="text-neutral-500">↔ </span>
                      {((activity.distance || 0) / 1000).toFixed(1)} km
                    </div>

                    <div className="text-sm text-neutral-300">
                      <span className="text-neutral-500">◷ </span>
                      {Math.floor((activity.moving_time || 0) / 3600)}u{" "}
                      {Math.floor(((activity.moving_time || 0) % 3600) / 60)}m
                    </div>

                    <div className="text-sm text-neutral-300">
                      <span className="text-neutral-500">△ </span>
                      {Math.round(activity.total_elevation_gain || 0)} m
                    </div>

                    <div className="text-sm text-neutral-400 md:text-right">
                      {new Date(activity.start_date).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}

          {!activitiesLoading && activities.length > 5 && (
            <button
              className="mt-5 text-sm font-semibold text-purple-400 hover:text-purple-300 transition"
            >
              Bekijk alle ritten →
            </button>
          )}
          </div>
      </div>
    </main>
  );
}
