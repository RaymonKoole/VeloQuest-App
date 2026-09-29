"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { getWeekStart } from "@/lib/training/generateWeek";
import { WORKOUT_TYPE_ORDER, WORKOUT_TYPES, type WorkoutTypeId } from "@/lib/training/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type TrainingDay = {
  date: string;
  workoutType: WorkoutTypeId;
  title: string;
  description: string;
  durationMinutes: number;
  intensity: number;
  locked: boolean;
  note: string | null;
  completed?: boolean;
  changed?: boolean;
};

const DAY_LABELS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

function addDays(dateIso: string, amount: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatDateNl(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

const today = new Date().toISOString().slice(0, 10);

export default function TrainingPage() {
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const [days, setDays] = useState<TrainingDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [preview, setPreview] = useState<TrainingDay[] | null>(null);
  const [previewType, setPreviewType] = useState<WorkoutTypeId | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function loadWeek(targetWeekStart: string) {
    setLoading(true);
    setError("");

    const headers = await getAuthHeaders();

    if (!headers) {
      return;
    }

    const response = await fetch(`/api/training?weekStart=${targetWeekStart}`, { headers });
    const json = await response.json();

    if (!response.ok) {
      setError(json.error || "Trainingsschema kon niet worden geladen.");
      setLoading(false);
      return;
    }

    setDays(json.days || []);
    setLoading(false);
  }

  useEffect(() => {
    loadWeek(weekStart);
  }, [weekStart]);

  function startEdit(date: string) {
    setEditingDate(date);
    setPreview(null);
    setPreviewType(null);
    setCustomTitle("");
    setMessage("");
  }

  function cancelEdit() {
    setEditingDate(null);
    setPreview(null);
    setPreviewType(null);
  }

  async function requestPreview(type: WorkoutTypeId) {
    if (!editingDate) {
      return;
    }

    setBusy(true);
    setPreviewType(type);

    try {
      const headers = await getAuthHeaders();

      if (!headers) {
        return;
      }

      const response = await fetch("/api/training/day", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editingDate,
          workoutType: type,
          title: type === "custom" ? customTitle || undefined : undefined,
          mode: "preview",
        }),
      });
      const json = await response.json();

      if (!response.ok) {
        setError(json.error || "Voorstel kon niet worden berekend.");
        return;
      }

      setPreview(json.days || []);
    } finally {
      setBusy(false);
    }
  }

  async function applyPreview() {
    if (!editingDate || !previewType) {
      return;
    }

    setBusy(true);

    try {
      const headers = await getAuthHeaders();

      if (!headers) {
        return;
      }

      const response = await fetch("/api/training/day", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editingDate,
          workoutType: previewType,
          title: previewType === "custom" ? customTitle || undefined : undefined,
          mode: "apply",
        }),
      });
      const json = await response.json();

      if (!response.ok) {
        setError(json.error || "Wijziging kon niet worden opgeslagen.");
        return;
      }

      setDays(json.days || []);
      setMessage("Trainingsweek bijgewerkt.");
      cancelEdit();
    } finally {
      setBusy(false);
    }
  }

  const changedDates = new Set((preview || []).filter((day) => day.changed).map((day) => day.date));
  const displayDays = preview || days;

  return (
    <>
      <h1 className="text-3xl font-bold">📅 Trainingsschema</h1>
      <p className="mt-1 text-neutral-400">
        Een wekelijks trainingsvoorstel op basis van vaste coachprincipes: nooit twee zware
        dagen achter elkaar, altijd herstel na een pittige inspanning, en genoeg rust en
        duurkilometers. Pas een dag aan — bijvoorbeeld een Zwift race op maandag — en VeloQuest
        stelt voor hoe de rest van de week eromheen het beste past.
      </p>
      <p className="mt-2 text-xs text-neutral-600">
        Let op: dit is een hulpmiddel op basis van algemene trainingsprincipes, geen
        gepersonaliseerd of medisch advies. Luister altijd naar je eigen lichaam.
      </p>

      {message && (
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          ← Vorige week
        </button>

        <p className="text-sm font-medium text-neutral-300">
          Week van {formatDateNl(weekStart)} — {formatDateNl(addDays(weekStart, 6))}
        </p>

        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Volgende week →
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-neutral-400">Trainingsschema laden...</p>
      ) : (
        <div className="mt-6 space-y-3">
          {displayDays.map((day, index) => {
            const def = WORKOUT_TYPES[day.workoutType];
            const isPast = day.date < today;
            const isEditing = editingDate === day.date;
            const isChanged = changedDates.has(day.date);

            return (
              <div
                key={day.date}
                className={`rounded-2xl border p-5 ${
                  isChanged ? "border-amber-600 bg-amber-950/10" : "border-neutral-800 bg-neutral-900"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{def.icon}</span>
                    <div>
                      <p className="text-xs text-neutral-500">
                        {DAY_LABELS[index % 7]} · {formatDateNl(day.date)}
                        {day.completed && (
                          <span className="ml-2 text-green-400">✓ gereden</span>
                        )}
                      </p>
                      <p className="font-semibold">{day.title}</p>
                      <p className="mt-1 text-sm text-neutral-400">{day.description}</p>
                      {day.note && (
                        <p className="mt-1 text-xs italic text-neutral-500">💬 {day.note}</p>
                      )}
                      {day.durationMinutes > 0 && (
                        <p className="mt-1 text-xs text-neutral-600">± {day.durationMinutes} min</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${def.color}22`, color: def.color }}
                    >
                      {def.label}
                    </span>

                    {!isPast && !preview && (
                      <button
                        type="button"
                        onClick={() => (isEditing ? cancelEdit() : startEdit(day.date))}
                        className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700"
                      >
                        {isEditing ? "Sluiten" : "Wijzig"}
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <p className="mb-2 text-xs font-medium text-neutral-400">
                      Wat wil je deze dag doen?
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {WORKOUT_TYPE_ORDER.map((typeId) => {
                        const typeDef = WORKOUT_TYPES[typeId];

                        return (
                          <button
                            key={typeId}
                            type="button"
                            disabled={busy}
                            onClick={() => requestPreview(typeId)}
                            className={`rounded-lg px-3 py-1.5 text-xs disabled:opacity-50 ${
                              previewType === typeId
                                ? "bg-[#d59a57] text-neutral-950"
                                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                            }`}
                          >
                            {typeDef.icon} {typeDef.label}
                          </button>
                        );
                      })}
                    </div>

                    {previewType === "custom" && (
                      <input
                        type="text"
                        placeholder="Naam van je activiteit (bv. Gravel toertocht)"
                        value={customTitle}
                        onChange={(event) => setCustomTitle(event.target.value)}
                        onBlur={() => requestPreview("custom")}
                        className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                      />
                    )}

                    {preview && (
                      <div className="mt-4 flex items-center gap-3 border-t border-neutral-800 pt-3">
                        <p className="flex-1 text-xs text-neutral-400">
                          Voorstel hierboven zichtbaar (oranje = aangepast). Bevestig om dit op te
                          slaan.
                        </p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={applyPreview}
                          className="rounded-lg bg-[#d59a57] px-3 py-1.5 text-sm font-medium text-neutral-950 hover:opacity-90 disabled:opacity-50"
                        >
                          {busy ? "Bezig..." : "Toepassen"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={cancelEdit}
                          className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700"
                        >
                          Annuleren
                        </button>
                      </div>
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
