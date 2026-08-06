"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
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
      }
      if (session?.user.user_metadata.full_name) {
  setUserName(session.user.user_metadata.full_name);
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
  <h2 className="text-xl font-semibold">
    🚴 Strava
  </h2>

  <p className="mt-2 text-neutral-400">
    Koppel je Strava-account om ritten te synchroniseren.
  </p>

  <a
    href="/api/strava/auth"
    className="mt-5 inline-block rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 transition"
  >
    Koppel met Strava
  </a>
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
