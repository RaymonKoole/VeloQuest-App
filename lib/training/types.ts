export type WorkoutTypeId =
  | "rest"
  | "recovery"
  | "endurance"
  | "tempo"
  | "interval"
  | "sprint"
  | "long_ride"
  | "race"
  | "custom";

export type WorkoutTypeDef = {
  id: WorkoutTypeId;
  label: string;
  icon: string;
  color: string;
  // 0 = volledige rust, 5 = maximale inspanning (wedstrijd). Bepaalt welke
  // dagen wel/niet naast elkaar mogen staan in de weekplanning.
  intensity: number;
  defaultDurationMinutes: number;
  description: string;
};

// Wielren-trainingstypes met een korte coach-uitleg. Duur en intensiteit
// zijn richtlijnen (geen wattage/FTP, want die data komt niet uit Strava) —
// bedoeld als praktisch hulpmiddel, niet als medisch/professioneel advies.
export const WORKOUT_TYPES: Record<WorkoutTypeId, WorkoutTypeDef> = {
  rest: {
    id: "rest",
    label: "Rustdag",
    icon: "🛌",
    color: "#64748b",
    intensity: 0,
    defaultDurationMinutes: 0,
    description:
      "Geen training. Herstel is net zo belangrijk als trainen — dit is waar je lichaam sterker wordt.",
  },
  recovery: {
    id: "recovery",
    label: "Herstelrit",
    icon: "🌱",
    color: "#22c55e",
    intensity: 1,
    defaultDurationMinutes: 40,
    description:
      "Heel rustig fietsen, bewust laag tempo, om spieren te laten herstellen na een zware inspanning.",
  },
  endurance: {
    id: "endurance",
    label: "Duurtraining",
    icon: "🚴",
    color: "#0ea5e9",
    intensity: 2,
    defaultDurationMinutes: 75,
    description:
      "Rustig, gelijkmatig tempo waarbij je nog een gesprek kunt voeren. De basis van je conditie.",
  },
  tempo: {
    id: "tempo",
    label: "Tempotraining",
    icon: "📈",
    color: "#f59e0b",
    intensity: 3,
    defaultDurationMinutes: 60,
    description:
      "Stevig, comfortabel-zwaar tempo net onder je drempel — bouwt duurkracht op.",
  },
  interval: {
    id: "interval",
    label: "Intervaltraining",
    icon: "⚡",
    color: "#ef4444",
    intensity: 4,
    defaultDurationMinutes: 65,
    description:
      "Herhaalde korte, harde inspanningen met herstel ertussen — verbetert je drempelvermogen.",
  },
  sprint: {
    id: "sprint",
    label: "Sprinttraining",
    icon: "💥",
    color: "#dc2626",
    intensity: 4,
    defaultDurationMinutes: 60,
    description:
      "Korte, maximale sprints met veel rust ertussen — traint explosiviteit en herstel.",
  },
  long_ride: {
    id: "long_ride",
    label: "Lange rit",
    icon: "🗺️",
    color: "#0891b2",
    intensity: 3,
    defaultDurationMinutes: 150,
    description:
      "Een lange, rustige rit die je uithoudingsvermogen opbouwt — vaak in het weekend.",
  },
  race: {
    id: "race",
    label: "Wedstrijd / Zwift race",
    icon: "🏁",
    color: "#7c3aed",
    intensity: 5,
    defaultDurationMinutes: 75,
    description:
      "Een wedstrijd of Zwift race op maximale inspanning — telt als de zwaarste dag van de week.",
  },
  custom: {
    id: "custom",
    label: "Vrije invulling",
    icon: "✏️",
    color: "#a3a3a3",
    intensity: 3,
    defaultDurationMinutes: 60,
    description: "Zelf ingevulde activiteit.",
  },
};

export const WORKOUT_TYPE_ORDER: WorkoutTypeId[] = [
  "rest",
  "recovery",
  "endurance",
  "tempo",
  "interval",
  "sprint",
  "long_ride",
  "race",
  "custom",
];

export function isHighIntensity(intensity: number): boolean {
  return intensity >= 4;
}
