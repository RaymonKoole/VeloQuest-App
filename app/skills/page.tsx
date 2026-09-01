"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { getSkillProgress } from "@/lib/progression/skillLevel";
import Navbar from "@/components/Navbar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function SkillsPage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);

  useEffect(() => {
    async function loadSkills() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/skills", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSkills(data.skills || []);
      }

      setSkillsLoading(false);
    }

    loadSkills();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Navbar active="/skills" />

        <h1 className="text-4xl font-bold">
          🧬 Skills
        </h1>

        <p className="mt-3 max-w-2xl text-neutral-400">
          Ontwikkel je fietsskills door te rijden, te klimmen en steeds
          sterker te worden.
        </p>

        {skillsLoading ? (
          <p className="mt-8 text-sm text-neutral-400">
            Skills laden...
          </p>
        ) : skills.length === 0 ? (
          <p className="mt-8 text-sm text-neutral-400">
            Nog geen skills beschikbaar.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {skills.map((skill) => {
              const skillProgress = getSkillProgress(skill.xp);

              return (
                <div
                  key={skill.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="text-4xl">
                        {skill.icon}
                      </span>

                      <div>
                        <h2 className="text-xl font-semibold">
                          {skill.name}
                        </h2>

                        <p className="mt-1 text-sm text-neutral-500">
                          {skill.description}
                        </p>
                      </div>
                    </div>

                    <div className="whitespace-nowrap text-right">
                      <p className="text-sm text-neutral-500">
                        Level
                      </p>

                      <p className="text-2xl font-bold text-purple-400">
                        {skillProgress.level}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-400">
                        {Math.round(skill.xp).toLocaleString("nl-NL")} XP
                      </span>

                      <span className="text-neutral-500">
                        {Math.ceil(
                          skillProgress.xpToNextLevel
                        ).toLocaleString("nl-NL")}{" "}
                        XP naar Level {skillProgress.level + 1}
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all"
                        style={{
                          width: `${skillProgress.progress}%`,
                        }}
                      />
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