import { WORKOUT_TYPES, isHighIntensity, type WorkoutTypeId } from "@/lib/training/types";

export type TrainingDay = {
  date: string; // YYYY-MM-DD
  workoutType: WorkoutTypeId;
  title: string;
  description: string;
  durationMinutes: number;
  intensity: number;
  locked: boolean;
  note: string | null;
};

type LockedInput = {
  date: string;
  workoutType: WorkoutTypeId;
  title?: string;
  description?: string;
  durationMinutes?: number;
};

const DAY_LABELS = [
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
  "zondag",
];

function addDays(dateIso: string, amount: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function getWeekDates(weekStartIso: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStartIso, index));
}

// Maandag van de week waarin `dateIso` valt.
export function getWeekStart(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  const isoDayOfWeek = (date.getUTCDay() + 6) % 7; // 0 = maandag
  return addDays(dateIso, -isoDayOfWeek);
}

function buildDay(
  dateIso: string,
  workoutType: WorkoutTypeId,
  locked: boolean,
  note: string | null,
  overrides?: { title?: string; description?: string; durationMinutes?: number }
): TrainingDay {
  const def = WORKOUT_TYPES[workoutType];

  return {
    date: dateIso,
    workoutType,
    title: overrides?.title || def.label,
    description: overrides?.description || def.description,
    durationMinutes: overrides?.durationMinutes ?? def.defaultDurationMinutes,
    intensity: def.intensity,
    locked,
    note,
  };
}

/**
 * Stelt een trainingsweek (maandag t/m zondag) samen volgens een aantal
 * vaste coachprincipes:
 *  - nooit twee zware dagen (intensiteit 4+) direct na elkaar
 *  - een hersteldag (of rustdag) direct na een zware inspanning/wedstrijd
 *  - precies 1 rustdag en 1 lange rit per week
 *  - minstens 1 pittige dag (interval/sprint/wedstrijd) per week, tenzij er
 *    simpelweg geen ruimte meer is door eigen wijzigingen
 *
 * `lockedDays` zijn dagen die de gebruiker zelf heeft gekozen — die blijven
 * altijd staan zoals gekozen. Alle overige dagen worden (opnieuw) ingevuld.
 * `previousWeekHadHardDay` bepaalt of we deze week extra ons best doen om
 * een pittige dag in te plannen (compensatie voor een rustige week ervoor).
 */
export function generateWeek(
  weekStartIso: string,
  lockedDays: LockedInput[],
  previousWeekHadHardDay: boolean
): TrainingDay[] {
  const dates = getWeekDates(weekStartIso);
  const lockedByDate = new Map(lockedDays.map((day) => [day.date, day]));

  const slots: (TrainingDay | null)[] = dates.map((date) => {
    const locked = lockedByDate.get(date);

    if (!locked) {
      return null;
    }

    return buildDay(date, locked.workoutType, true, null, locked);
  });

  const intensityAt = (index: number): number =>
    slots[index]?.intensity ?? -1;

  // 1) Verplichte hersteldag direct na een zware inspanning of wedstrijd.
  for (let index = 0; index < 7; index += 1) {
    if (!slots[index] || !isHighIntensity(slots[index]!.intensity)) {
      continue;
    }

    const nextIndex = index + 1;

    if (nextIndex < 7 && !slots[nextIndex]) {
      slots[nextIndex] = buildDay(
        dates[nextIndex],
        "recovery",
        false,
        `Hersteldag na ${DAY_LABELS[index]} — belangrijk om het lichaam te laten bijkomen.`
      );
    }
  }

  const hasRest = slots.some((day) => day?.workoutType === "rest");
  const hasLongRide = slots.some(
    (day) => day?.workoutType === "long_ride" || day?.workoutType === "race"
  );
  const hasHardDay = slots.some((day) => day && isHighIntensity(day.intensity));

  // 2) Rustdag: bij voorkeur een dag die toch al hersteldag zou worden
  //    (dan is volledige rust nog beter), anders maandag, anders vrijdag,
  //    anders de eerste vrije dag.
  if (!hasRest) {
    const upgradeIndex = slots.findIndex((day) => day?.workoutType === "recovery" && !day.locked);
    const preferredOrder = [upgradeIndex, 0, 4, slots.findIndex((day) => day === null)];
    const targetIndex = preferredOrder.find((index) => index !== undefined && index >= 0 && index < 7);

    if (targetIndex !== undefined && targetIndex >= 0) {
      slots[targetIndex] = buildDay(
        dates[targetIndex],
        "rest",
        false,
        "Vaste rustdag deze week, voor een goede balans tussen belasting en herstel."
      );
    }
  }

  // 3) Lange rit: bij voorkeur zaterdag of zondag, anders eerste vrije dag.
  if (!hasLongRide) {
    const preferredOrder = [5, 6, slots.findIndex((day) => day === null)];
    const targetIndex = preferredOrder.find((index) => index !== undefined && index >= 0 && slots[index] === null);

    if (targetIndex !== undefined && targetIndex >= 0) {
      slots[targetIndex] = buildDay(
        dates[targetIndex],
        "long_ride",
        false,
        "Lange, rustige rit voor je uithoudingsvermogen — mooi te combineren met een vrij weekend."
      );
    }
  }

  // 4) Minstens 1 pittige dag: dinsdag of donderdag, mits niet naast een
  //    andere zware dag. Extra prioriteit als vorige week geen pittige dag had.
  if (!hasHardDay) {
    const candidateOrder = [1, 3, ...slots.map((_, index) => index)];

    for (const index of candidateOrder) {
      if (slots[index] !== null) {
        continue;
      }

      const prevOk = index === 0 || !isHighIntensity(intensityAt(index - 1));
      const nextOk = index === 6 || !isHighIntensity(intensityAt(index + 1));

      if (prevOk && nextOk) {
        slots[index] = buildDay(
          dates[index],
          "interval",
          false,
          previousWeekHadHardDay
            ? "Intervaltraining om je drempelvermogen te verbeteren."
            : "Intervaltraining — vorige week zat er weinig pit in, dus deze week weer een pittige dag."
        );
        break;
      }
    }
  }

  // 5) Overige lege dagen opvullen met duurtraining (met af en toe een
  //    tempotraining voor wat variatie), maar nooit naast een zware dag.
  let fillerCount = 0;

  for (let index = 0; index < 7; index += 1) {
    if (slots[index] !== null) {
      continue;
    }

    const prevIsHard = index > 0 && isHighIntensity(intensityAt(index - 1));
    const nextIsHard = index < 6 && isHighIntensity(intensityAt(index + 1));
    const type: WorkoutTypeId =
      !prevIsHard && !nextIsHard && fillerCount % 3 === 2 ? "tempo" : "endurance";

    slots[index] = buildDay(
      dates[index],
      type,
      false,
      type === "tempo"
        ? "Tempotraining voor wat extra pit deze week."
        : "Duurtraining om je basisconditie te onderhouden."
    );
    fillerCount += 1;
  }

  return slots.map((day) => day!);
}
