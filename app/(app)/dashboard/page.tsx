"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CharacterAvatar from "@/components/CharacterAvatar";
import type { GearSlot } from "@/lib/gear/types";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-pulse rounded-lg bg-neutral-800 ${className}`}
    />
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [stravaAthlete, setStravaAthlete] = useState<any>(null);
  const [stravaError, setStravaError] = useState("");
  const [xpData, setXpData] = useState<any>(null);
  const [gearItems, setGearItems] = useState<any[]>([]);
  const [gearLoading, setGearLoading] = useState(true);

  function loadDashboardData(accessToken: string) {
    const headers = { Authorization: `Bearer ${accessToken}` };

    const xp = fetch("/api/xp", { headers }).then(async (response) => {
      if (response.ok) {
        setXpData(await response.json());
      }
    });

    const gear = fetch("/api/gear", { headers }).then(async (response) => {
      if (response.ok) {
        setGearItems((await response.json()).items || []);
      }

      setGearLoading(false);
    });

    return Promise.all([xp, gear]);
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

      // Toon meteen de laatst bekende data; wacht niet op Strava.
      const dashboardDataLoaded = loadDashboardData(session.access_token);

      const profileResponse = await fetch("/api/strava/profile", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setStravaAthlete(profileData.athlete);

        // Sync op de achtergrond; ververs de dashboard-data pas zodra hij klaar is.
        fetch("/api/strava/sync", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }).then(async (syncResponse) => {
          if (syncResponse.ok) {
            await loadDashboardData(session.access_token);
          } else {
            console.error(
              "Automatische Strava-sync mislukt:",
              await syncResponse.text()
            );
          }
        });
      } else if (profileResponse.status === 401) {
        // Onderscheid tussen "nooit gekoppeld" (404) en "koppeling verlopen/
        // token vernieuwen mislukt" (401) — anders lijkt het voor de
        // gebruiker onterecht alsof Strava nooit gekoppeld is geweest.
        const profileError = await profileResponse.json().catch(() => ({}));
        setStravaError(
          profileError.error ||
            "Je Strava-koppeling lijkt niet meer geldig. Koppel opnieuw."
        );
      }

      await dashboardDataLoaded;
    }

    checkUser();
  }, [router]);

  return (
    <>
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

      {/* Character */}
      <Link
        href="/character"
        className="mt-6 flex flex-wrap items-center gap-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-neutral-700"
      >
        {gearLoading ? (
          <Skeleton className="h-20 w-32" />
        ) : (
          <CharacterAvatar
            equipment={Object.fromEntries(
              gearItems
                .filter((item) => item.equipped)
                .map((item) => [
                  item.slot as GearSlot,
                  { icon: item.icon, color: item.color, name: item.name },
                ])
            )}
            size="sm"
          />
        )}

        <div>
          <p className="text-lg font-semibold">🚴 Jouw character</p>
          <p className="mt-1 text-sm text-neutral-400">
            {gearLoading
              ? "Laden..."
              : `${gearItems.filter((item) => item.equipped).length}/9 sloten uitgerust`}
            {xpData ? ` · Level ${xpData.level}` : ""}
          </p>
          <p className="mt-1 text-sm text-[#d59a57]">Bekijk je character →</p>
        </div>
      </Link>

      {/* Strava */}
      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
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
            <p className={stravaError ? "text-amber-400" : "text-neutral-400"}>
              {stravaError ||
                "Koppel je Strava-account om ritten automatisch te synchroniseren."}
            </p>

            <a
              href="/api/strava/auth"
              className="rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 transition"
            >
              {stravaError ? "Opnieuw koppelen" : "Koppel met Strava"}
            </a>
          </div>
        )}
      </div>

      {/* Adventures & Wrapped */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Link
          href="/adventures"
          className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-purple-500/40"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">🗺️ Adventures</h2>
            <span className="text-sm text-purple-400">Bekijk →</span>
          </div>

          <p className="mt-2 text-sm text-neutral-400">
            Je ritten, routekaart en Strava-segmenten op één plek.
          </p>
        </Link>

        <Link
          href="/wrapped"
          className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-purple-500/40"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">✨ Wrapped</h2>
            <span className="text-sm text-purple-400">Bekijk →</span>
          </div>

          <p className="mt-2 text-sm text-neutral-400">
            Jouw fietsjaar in een notendop.
          </p>
        </Link>
      </div>
    </>
  );
}
