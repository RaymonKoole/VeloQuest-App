"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getSkillProgress } from "@/lib/progression/skillLevel";
import Navbar from "@/components/Navbar";

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

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Navbar active="/dashboard" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Welkom{userName ? `, ${userName}` : ""}! 👋
            </h1>

            <p className="mt-1 text-neutral-400">
              Hier is jouw overzicht.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
          >
            Uitloggen
          </button>
        </div>

        {/* Strava */}
        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold">
            🚴 Strava
          </h2>

          {stravaAthlete ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
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
                    {stravaAthlete.city ? ` · ${stravaAthlete.city}` : ""}
                    {stravaAthlete.country ? `, ${stravaAthlete.country}` : ""}
                  </p>
                </div>
              </div>

              <button
                onClick={handleStravaSync}
                className="rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 transition"
              >
                Synchroniseer activiteiten
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-neutral-400">
                Koppel je Strava-account om ritten automatisch te synchroniseren.
              </p>

              <a
                href="/api/strava/auth"
                className="rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 transition"
              >
                Koppel met Strava
              </a>
            </div>
          )}
        </div>

        {/* XP */}
        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
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
<div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
        {/* Skills / Quests / Achievements */}
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <Link
            href="/skills"
            className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-purple-500/40"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                🧬 Skills
              </h2>

              <span className="text-sm text-purple-400">
                Bekijk alles →
              </span>
            </div>

            {skillsLoading ? (
              <p className="mt-4 text-sm text-neutral-400">
                Laden...
              </p>
            ) : skills.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-400">
                Nog geen skills beschikbaar.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {skills.slice(0, 4).map((skill) => {
                  const skillProgress = getSkillProgress(skill.xp);

                  return (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-neutral-300">
                        {skill.icon} {skill.name}
                      </span>

                      <span className="text-neutral-500">
                        Level {skillProgress.level}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Link>

          <Link
            href="/quests"
            className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-purple-500/40"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                ⚔️ Quests
              </h2>

              <span className="text-sm text-purple-400">
                Bekijk alles →
              </span>
            </div>

            {questsLoading ? (
              <p className="mt-4 text-sm text-neutral-400">
                Laden...
              </p>
            ) : (
              <>
                <p className="mt-4 text-3xl font-bold">
                  {quests.filter((quest) => quest.completed).length}/
                  {quests.length}
                </p>

                <p className="mt-1 text-sm text-neutral-500">
                  voltooid
                </p>
              </>
            )}
          </Link>

          <Link
            href="/achievements"
            className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-purple-500/40"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                🏆 Achievements
              </h2>

              <span className="text-sm text-purple-400">
                Bekijk alles →
              </span>
            </div>

            {badgesLoading ? (
              <p className="mt-4 text-sm text-neutral-400">
                Laden...
              </p>
            ) : (
              <>
                <p className="mt-4 text-3xl font-bold">
                  {badges.filter((badge) => badge.unlocked).length}/
                  {badges.length}
                </p>

                <p className="mt-1 text-sm text-neutral-500">
                  ontgrendeld
                </p>
              </>
            )}
          </Link>
        </div>

        {/* Recente ritten */}
        <div className="mt-6 w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                🚴 Recente ritten
              </h2>

              <p className="mt-1 text-sm text-neutral-400">
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

          {!activitiesLoading && activities.length > 0 && (
            <Link
              href="/activities"
              className="mt-5 inline-block text-sm font-semibold text-purple-400 hover:text-purple-300 transition"
            >
              Bekijk alle ritten →
            </Link>
          )}
          </div>
      </div>
    </main>
  );
}
