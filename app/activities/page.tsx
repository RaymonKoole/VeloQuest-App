"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/activities", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }

      setActivitiesLoading(false);
    }

    loadActivities();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Navbar active="/activities" />

        <h1 className="text-4xl font-bold">
          🚴 Activities
        </h1>

        <p className="mt-3 max-w-2xl text-neutral-400">
          Bekijk je gefietste ritten en ontdek hoe je prestaties zich
          ontwikkelen.
        </p>

        {activitiesLoading ? (
          <p className="mt-8 text-sm text-neutral-400">
            Activiteiten laden...
          </p>
        ) : activities.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-neutral-400">
              Nog geen activiteiten beschikbaar.
            </p>

            <p className="mt-2 text-sm text-neutral-500">
              Koppel je Strava-account en synchroniseer je ritten.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {activities.map((activity) => {
              const distance = Number(activity.distance || 0) / 1000;

              const movingTime = Number(
                activity.moving_time || 0
              );

              const hours = Math.floor(movingTime / 3600);
              const minutes = Math.floor(
                (movingTime % 3600) / 60
              );

              const date = activity.start_date
                ? new Date(activity.start_date).toLocaleDateString(
                    "nl-NL",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )
                : "";

              return (
                <div
                  key={activity.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          🚴
                        </span>

                        <h2 className="text-lg font-semibold">
                          {activity.name || "Fietsrit"}
                        </h2>
                      </div>

                      <p className="mt-1 text-sm text-neutral-500">
                        {date}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-6 text-right">
                      <div>
                        <p className="text-xs text-neutral-500">
                          Afstand
                        </p>

                        <p className="mt-1 font-semibold">
                          {distance.toFixed(1)} km
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-neutral-500">
                          Beweegtijd
                        </p>

                        <p className="mt-1 font-semibold">
                          {hours}u {minutes}m
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-neutral-500">
                          Hoogtemeters
                        </p>

                        <p className="mt-1 font-semibold">
                          {Math.round(
                            Number(
                              activity.total_elevation_gain || 0
                            )
                          )}{" "}
                          hm
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
