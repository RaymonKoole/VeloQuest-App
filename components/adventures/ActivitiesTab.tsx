"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { buildElevationProfile, type ElevationPoint } from "@/lib/routes/elevationProfile";
import ElevationProfile from "@/components/adventures/ElevationProfile";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type ProfileState = {
  status: "loading" | "done" | "error";
  points: ElevationPoint[];
  error?: string;
};

export default function ActivitiesTab() {
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<Record<number, ProfileState>>({});

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

  async function toggleProfile(activityId: number) {
    if (expandedId === activityId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(activityId);

    if (profiles[activityId]) {
      return;
    }

    setProfiles((current) => ({
      ...current,
      [activityId]: { status: "loading", points: [] },
    }));

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`/api/activities/${activityId}/streams`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const data = await response.json();

    if (!response.ok) {
      setProfiles((current) => ({
        ...current,
        [activityId]: {
          status: "error",
          points: [],
          error: data.error || "Hoogteprofiel kon niet worden geladen.",
        },
      }));
      return;
    }

    const points = buildElevationProfile(data.altitude, data.latlng);

    setProfiles((current) => ({
      ...current,
      [activityId]:
        points.length >= 2
          ? { status: "done", points }
          : { status: "error", points: [], error: "Onvoldoende hoogtedata voor deze rit." },
    }));
  }

  return (
    <>
      <p className="text-neutral-400">
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

            const profile = profiles[activity.id];
            const isExpanded = expandedId === activity.id;

            return (
              <div
                key={activity.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    {activity.photo_url && (
                      <img
                        src={activity.photo_url}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                    )}

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

                <button
                  type="button"
                  onClick={() => toggleProfile(activity.id)}
                  className="mt-4 text-sm font-medium text-[#d59a57] hover:opacity-80"
                >
                  {isExpanded ? "▲ Verberg hoogteprofiel" : "📈 Toon hoogteprofiel"}
                </button>

                {isExpanded && (
                  <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    {!profile || profile.status === "loading" ? (
                      <p className="text-sm text-neutral-400">Hoogteprofiel laden...</p>
                    ) : profile.status === "error" ? (
                      <p className="text-sm text-neutral-500">{profile.error}</p>
                    ) : (
                      <ElevationProfile points={profile.points} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
