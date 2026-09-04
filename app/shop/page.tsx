"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { ALL_QUESTS_COMPLETED_GATE } from "@/lib/gear/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function formatRequirement(item: { requiredSkill: string | null; requiredLevel: number }) {
  if (item.requiredSkill === ALL_QUESTS_COMPLETED_GATE) {
    return "alle quests voltooid";
  }

  return item.requiredSkill
    ? `${item.requiredSkill}-level ${item.requiredLevel}`
    : `account-level ${item.requiredLevel}`;
}

const SLOT_LABELS: Record<string, string> = {
  jersey: "👕 Shirts",
  shorts: "🩳 Broeken",
  helmet: "⛑️ Helmen",
  shoes: "👟 Schoenen",
  gloves: "🧤 Handschoenen",
  glasses: "🕶️ Brillen",
  socks: "🧦 Sokken",
  accessory: "🎖️ Accessoires",
  cape: "🧥 Capes",
};

const SLOT_ORDER = [
  "jersey",
  "shorts",
  "helmet",
  "shoes",
  "gloves",
  "glasses",
  "socks",
  "cape",
  "accessory",
];

export default function ShopPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buyingId, setBuyingId] = useState<number | null>(null);
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

  async function loadGear(headers: Record<string, string>) {
    const response = await fetch("/api/gear", { headers });
    const json = await response.json();

    if (!response.ok) {
      setError(json.error || "Kleding kon niet worden geladen.");
      return;
    }

    setItems(json.items || []);
  }

  useEffect(() => {
    async function load() {
      const headers = await getAuthHeaders();

      if (!headers) {
        return;
      }

      await loadGear(headers);
      setLoading(false);
    }

    load();
  }, []);

  async function handleBuy(itemId: number) {
    setBuyingId(itemId);
    setMessage("");

    try {
      const headers = await getAuthHeaders();

      if (!headers) {
        return;
      }

      const response = await fetch("/api/gear/buy", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const json = await response.json();

      if (!response.ok) {
        setMessage(json.error || "Kopen is niet gelukt.");
        return;
      }

      setMessage(`${json.itemName} toegevoegd aan je garderobe! 🎉`);
      await loadGear(headers);
    } catch (buyError) {
      console.error("Kopen mislukt:", buyError);
      setMessage("Kopen is niet gelukt. Probeer het later opnieuw.");
    } finally {
      setBuyingId(null);
    }
  }

  const itemsBySlot = new Map<string, any[]>();

  for (const item of items) {
    const list = itemsBySlot.get(item.slot) || [];
    list.push(item);
    itemsBySlot.set(item.slot, list);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Navbar active="/shop" />

        <h1 className="text-3xl font-bold">🛍️ Shop</h1>
        <p className="mt-1 text-neutral-400">
          Verdien levels door te fietsen en speel zo nieuwe wielerkleding vrij.
          Vereist level gehaald? Dan is het gratis van jou.
        </p>

        {message && (
          <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-neutral-400">Shop laden...</p>
        ) : error ? (
          <p className="mt-8 text-sm text-red-400">{error}</p>
        ) : (
          <div className="mt-8 space-y-10">
            {SLOT_ORDER.filter((slot) => itemsBySlot.has(slot)).map((slot) => (
              <section key={slot}>
                <h2 className="text-xl font-bold">{SLOT_LABELS[slot] || slot}</h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(itemsBySlot.get(slot) || []).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border bg-neutral-900 p-5"
                      style={{ borderColor: `${item.color}55` }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{item.icon}</span>

                        <div className="flex-1">
                          <h3 className="font-semibold">{item.name}</h3>

                          <span
                            className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                            style={{
                              backgroundColor: `${item.color}22`,
                              color: item.color,
                            }}
                          >
                            {item.rarity}
                          </span>
                        </div>
                      </div>

                      {item.description && (
                        <p className="mt-3 text-xs text-neutral-500">
                          {item.description}
                        </p>
                      )}

                      <p className="mt-3 text-xs text-neutral-600">
                        Vereist: {formatRequirement(item)}
                      </p>

                      <div className="mt-4">
                        {item.owned ? (
                          <span className="inline-block rounded-lg bg-green-500/20 px-3 py-1.5 text-sm font-medium text-green-400">
                            ✓ In bezit
                          </span>
                        ) : item.eligible ? (
                          <button
                            type="button"
                            onClick={() => handleBuy(item.id)}
                            disabled={buyingId === item.id}
                            className="rounded-lg bg-[#d59a57] px-3 py-1.5 text-sm font-medium text-neutral-950 hover:opacity-90 disabled:opacity-50"
                          >
                            {buyingId === item.id ? "Bezig..." : "Koop"}
                          </button>
                        ) : (
                          <span className="inline-block rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-500">
                            🔒 Vereist: {formatRequirement(item)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
