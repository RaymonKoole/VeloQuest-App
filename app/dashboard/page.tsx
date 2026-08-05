"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
      }
    }

    checkUser();
  }, [router]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        <h1 className="text-4xl font-bold">
          🚴 Welkom bij VeloQuest
        </h1>

        <p className="mt-3 text-neutral-400">
          Je bent succesvol ingelogd.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-semibold">🚴 Ritten</h2>
            <p className="mt-2 text-neutral-400">
              Bekijk al je ritten.
            </p>
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
