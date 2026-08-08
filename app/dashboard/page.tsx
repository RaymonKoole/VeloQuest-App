"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [stravaAthlete, setStravaAthlete] = useState<any>(null);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  async function handleStravaSync() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    router.push("/login");
    return;
  }
const activitiesResponse = await fetch("/api/activities", {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});

if (activitiesResponse.ok) {
  const activitiesData = await activitiesResponse.json();

  setActivities(activitiesData.activities);
}

setActivitiesLoading(false);
const statsResponse = await fetch("/api/stats", {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});

if (statsResponse.ok) {
  const statsData = await statsResponse.json();

  setStats(statsData);
}

setStatsLoading(false);
  const response = await fetch("/api/strava/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const data = await response.json();

  console.log("Strava sync:", data);

  if (!response.ok) {
    alert(data.error || "Synchroniseren mislukt.");
    return;
  }

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
    const profileResponse = await fetch("/api/strava/profile", {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});
const activitiesResponse = await fetch("/api/strava/activities", {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});

if (activitiesResponse.ok) {
  const activitiesData = await activitiesResponse.json();

  console.log("Strava activiteiten:", activitiesData.activities);
}

if (profileResponse.ok) {
  const profileData = await profileResponse.json();

  console.log("Strava profiel:", profileData.athlete);

  setStravaAthlete(profileData.athlete);
}

    if (session.user.user_metadata.full_name) {
      setUserName(session.user.user_metadata.full_name);
    }

    const params = new URLSearchParams(window.location.search);
    const stravaCode = params.get("strava_code");

    if (stravaCode) {
      const response = await fetch("/api/strava/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          code: stravaCode,
        }),
      });

      if (response.ok) {
        window.history.replaceState({}, "", "/dashboard");
      } else {
        console.error("Strava koppelen mislukt:", await response.text());
      }
    }
  }

  checkUser();
}, [router]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
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
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
<div className="mt-10 w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
  <h2 className="text-2xl font-bold">
    🚴 Recente ritten
  </h2>

  <p className="mt-2 text-neutral-400">
    Je Strava-activiteiten opgeslagen in VeloQuest.
  </p>

  {activitiesLoading ? (
    <p className="mt-6 text-neutral-400">
      Activiteiten laden...
    </p>
  ) : activities.length === 0 ? (
    <p className="mt-6 text-neutral-400">
      Nog geen activiteiten gevonden.
    </p>
  ) : (
    <div className="mt-6 space-y-3">
      {activities.slice(0, 10).map((activity) => (
        <div
          key={activity.strava_activity_id}
          className="rounded-xl bg-neutral-800 p-4"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold text-white">
                {activity.name || "Naamloze rit"}
              </h3>

              <p className="text-sm text-neutral-400">
                {activity.activity_type || "Activiteit"}
              </p>
            </div>

            <div className="text-sm text-neutral-300">
              {(activity.distance / 1000).toFixed(1)} km
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-400">
            <span>
              ⏱️ {Math.round(activity.moving_time / 60)} min
            </span>

            <span>
              ⛰️ {Math.round(activity.total_elevation_gain || 0)} m
            </span>

            <span>
              📅{" "}
              {new Date(activity.start_date).toLocaleDateString("nl-NL")}
            </span>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
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

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">🏅 Badges</h2>
            <p className="mt-2 text-neutral-400">
              Verdien nieuwe achievements.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">🗺️ Routes</h2>
            <p className="mt-2 text-neutral-400">
              Ontdek nieuwe routes.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">⚙️ Profiel</h2>
            <p className="mt-2 text-neutral-400">
              Beheer jouw account.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}
