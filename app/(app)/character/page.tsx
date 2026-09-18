"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import CharacterAvatar from "@/components/CharacterAvatar";
import { ALL_GEAR_SLOTS, type GearSlot } from "@/lib/gear/types";
import { getSkillProgress } from "@/lib/progression/skillLevel";
import { skillNameNl } from "@/lib/skills/skillNameNl";
import { getSkillInfo } from "@/lib/skills/skillInfo";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const SLOT_LABELS: Record<GearSlot, string> = {
  bike_frame: "Frame",
  bike_wheels: "Wielen",
  bike_groupset: "Aandrijving",
  bike_saddle: "Zadel",
  bike_handlebar: "Stuur",
  jersey: "Shirt",
  shorts: "Broek",
  helmet: "Helm",
  shoes: "Schoenen",
  gloves: "Handschoenen",
  glasses: "Bril",
  socks: "Sokken",
  accessory: "Accessoire",
  cape: "Cape",
};

const TOTAL_SLOTS = ALL_GEAR_SLOTS.length;

export default function CharacterPage() {
  const [gearItems, setGearItems] = useState<any[]>([]);
  const [xp, setXp] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openSlot, setOpenSlot] = useState<GearSlot | null>(null);
  const [openSkillId, setOpenSkillId] = useState<number | null>(null);
  const [equipping, setEquipping] = useState(false);
  const [message, setMessage] = useState("");

  async function getAuthHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return null;
    }

    return { Authorization: `Bearer ${session.access_token}` };
  }

  async function loadAll(headers: Record<string, string>) {
    const [gearResponse, xpResponse, skillsResponse] = await Promise.all([
      fetch("/api/gear", { headers }),
      fetch("/api/xp", { headers }),
      fetch("/api/skills", { headers }),
    ]);

    if (gearResponse.ok) {
      const gearJson = await gearResponse.json();
      setGearItems(gearJson.items || []);
    } else {
      const gearJson = await gearResponse.json().catch(() => ({}));
      setError(gearJson.error || "Garderobe kon niet worden geladen.");
    }

    if (xpResponse.ok) {
      setXp(await xpResponse.json());
    }

    if (skillsResponse.ok) {
      const skillsJson = await skillsResponse.json();
      setSkills(skillsJson.skills || []);
    }
  }

  useEffect(() => {
    async function load() {
      const headers = await getAuthHeaders();

      if (!headers) {
        return;
      }

      await loadAll(headers);
      setLoading(false);
    }

    load();
  }, []);

  const equipment = useMemo(() => {
    const map: Partial<Record<GearSlot, any>> = {};

    for (const item of gearItems) {
      if (item.equipped) {
        map[item.slot as GearSlot] = item;
      }
    }

    return map;
  }, [gearItems]);

  const ownedBySlot = useMemo(() => {
    const map: Partial<Record<GearSlot, any[]>> = {};

    for (const item of gearItems) {
      if (!item.owned) {
        continue;
      }

      const list = map[item.slot as GearSlot] || [];
      list.push(item);
      map[item.slot as GearSlot] = list;
    }

    return map;
  }, [gearItems]);

  const totalLevel = useMemo(
    () => skills.reduce((sum, skill) => sum + getSkillProgress(skill.xp).level, 0),
    [skills]
  );

  const gearBySkill = useMemo(() => {
    const map: Record<string, any[]> = {};

    for (const item of gearItems) {
      if (!item.requiredSkill) {
        continue;
      }

      const list = map[item.requiredSkill] || [];
      list.push(item);
      map[item.requiredSkill] = list;
    }

    for (const list of Object.values(map)) {
      list.sort((a, b) => a.requiredLevel - b.requiredLevel);
    }

    return map;
  }, [gearItems]);

  const ownedCount = useMemo(
    () => gearItems.filter((item) => item.owned).length,
    [gearItems]
  );

  async function handleEquip(slot: GearSlot, itemId: number | null) {
    setEquipping(true);
    setMessage("");

    try {
      const headers = await getAuthHeaders();

      if (!headers) {
        return;
      }

      const response = await fetch("/api/gear/equip", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ slot, itemId }),
      });
      const json = await response.json();

      if (!response.ok) {
        setMessage(json.error || "Uitrusten is niet gelukt.");
        return;
      }

      await loadAll(headers);
      setOpenSlot(null);
    } catch (equipError) {
      console.error("Uitrusten mislukt:", equipError);
      setMessage("Uitrusten is niet gelukt. Probeer het later opnieuw.");
    } finally {
      setEquipping(false);
    }
  }

  const equippedCount = Object.keys(equipment).length;

  return (
    <>
      <h1 className="text-3xl font-bold">🚴 Jouw personage</h1>
      <p className="mt-1 text-neutral-400">
        Rust kleding uit die je hebt vrijgespeeld in de{" "}
        <Link href="/shop" className="text-[#d59a57] hover:underline">
          winkel
        </Link>
        .
      </p>

      {message && (
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-neutral-400">Personage laden...</p>
      ) : error ? (
        <p className="mt-8 text-sm text-red-400">{error}</p>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
            <CharacterAvatar
              equipment={equipment}
              size="lg"
              onSlotClick={(slot) => setOpenSlot(openSlot === slot ? null : slot)}
            />

            <p className="text-sm text-neutral-500">
              {equippedCount}/{TOTAL_SLOTS} sloten uitgerust
            </p>

            <div className="flex gap-6">
              {xp && (
                <div className="text-center">
                  <p className="text-xs text-neutral-500">Account-niveau</p>
                  <p className="text-2xl font-bold text-purple-400">{xp.level}</p>
                </div>
              )}

              {skills.length > 0 && (
                <div className="text-center">
                  <p className="text-xs text-neutral-500">Totaalniveau</p>
                  <p className="text-2xl font-bold text-amber-400">{totalLevel}</p>
                </div>
              )}
            </div>

            <p className="text-xs text-neutral-600">
              🧢 {ownedCount}/{gearItems.length} kledingstukken verzameld
            </p>

            {openSlot && (
              <div className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="mb-2 text-xs font-medium text-neutral-400">
                  {SLOT_LABELS[openSlot]} kiezen
                </p>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={equipping}
                    onClick={() => handleEquip(openSlot, null)}
                    className="rounded-lg px-3 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-900 disabled:opacity-50"
                  >
                    ✕ Niets (leeg)
                  </button>

                  {(ownedBySlot[openSlot] || []).length === 0 ? (
                    <p className="px-3 py-2 text-sm text-neutral-600">
                      Nog niks vrijgespeeld voor dit slot — bezoek de winkel.
                    </p>
                  ) : (
                    (ownedBySlot[openSlot] || []).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={equipping}
                        onClick={() => handleEquip(openSlot, item.id)}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-900 disabled:opacity-50 ${
                          item.equipped ? "text-[#d59a57]" : "text-neutral-200"
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                        {item.equipped && <span className="ml-auto">✓</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-lg font-semibold">Vaardigheden</h2>

            <div className="mt-4 space-y-2">
              {skills.map((skill) => {
                const progress = getSkillProgress(skill.xp);
                const isOpen = openSkillId === skill.id;
                const info = getSkillInfo(skill.name);
                const gearForSkill = gearBySkill[skill.name] || [];

                return (
                  <div key={skill.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSkillId(isOpen ? null : skill.id)
                      }
                      className="flex w-full items-center gap-3 rounded-lg py-1 text-left hover:bg-neutral-800/50"
                    >
                      <span className="w-6 text-center">{skill.icon}</span>
                      <span className="w-24 text-sm text-neutral-300">
                        {skillNameNl(skill.name)}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-purple-500"
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-sm font-semibold text-purple-400">
                        {progress.level}
                      </span>
                      <span className="w-4 text-center text-xs text-neutral-500">
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="ml-9 mr-4 mb-2 mt-1 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                        <p className="text-sm text-neutral-300">{info.about}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {info.training}
                        </p>
                        <p className="mt-2 text-xs text-neutral-600">
                          {progress.xpToNextLevel > 0
                            ? `Nog ${progress.xpToNextLevel.toLocaleString("nl-NL")} XP tot level ${progress.level + 1}`
                            : "Maximale level bereikt"}
                        </p>

                        {gearForSkill.length > 0 && (
                          <div className="mt-3 space-y-1 border-t border-neutral-800 pt-3">
                            <p className="mb-2 text-xs font-medium text-neutral-400">
                              Uitrusting voor deze skill
                            </p>

                            {gearForSkill.map((item) => {
                              const state = item.owned
                                ? "owned"
                                : item.eligible
                                ? "eligible"
                                : "locked";

                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                                    state === "locked"
                                      ? "text-neutral-600"
                                      : state === "eligible"
                                      ? "text-amber-400"
                                      : "text-neutral-200"
                                  }`}
                                >
                                  <span className="w-5 text-center">
                                    {item.icon}
                                  </span>
                                  <span className="flex-1">{item.name}</span>
                                  <span className="text-xs text-neutral-600">
                                    Lvl {item.requiredLevel}
                                  </span>
                                  <span className="w-5 text-center">
                                    {state === "owned"
                                      ? "✓"
                                      : state === "eligible"
                                      ? "🔓"
                                      : "🔒"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
