import {
  ALL_BADGES_UNLOCKED_GATE,
  ALL_QUESTS_COMPLETED_GATE,
  MAX_TOTAL_LEVEL_GATE,
} from "@/lib/gear/types";
import { skillNameNl } from "@/lib/skills/skillNameNl";

// Vaste volgorde (zelfde als de skills-tabel) zodat groepen altijd in
// dezelfde volgorde verschijnen, ongeacht de sorteervolgorde van de items zelf.
const SKILL_ORDER = [
  "Cycling", "Climbing", "Endurance", "Explorer", "Speed", "Racing",
  "Adventure", "Navigator", "Social", "Discipline", "Power", "Popularity",
  "Winter", "Spring", "Summer", "Autumn",
];

const PRESTIGE_GATES: string[] = [
  ALL_QUESTS_COMPLETED_GATE,
  ALL_BADGES_UNLOCKED_GATE,
  MAX_TOTAL_LEVEL_GATE,
];

export function groupItemsBySkill<
  T extends { requiredSkill: string | null; requiredLevel: number }
>(items: T[]) {
  const groups = new Map<string, { label: string; items: T[] }>();

  for (const item of items) {
    const key = !item.requiredSkill
      ? "__generic__"
      : PRESTIGE_GATES.includes(item.requiredSkill)
      ? "__prestige__"
      : item.requiredSkill;

    const label =
      key === "__generic__"
        ? "Algemeen"
        : key === "__prestige__"
        ? "Prestige"
        : skillNameNl(item.requiredSkill!);

    if (!groups.has(key)) {
      groups.set(key, { label, items: [] });
    }

    groups.get(key)!.items.push(item);
  }

  const order = ["__generic__", ...SKILL_ORDER, "__prestige__"];

  return order
    .filter((key) => groups.has(key))
    .map((key) => {
      const group = groups.get(key)!;

      return {
        key,
        label: group.label,
        items: [...group.items].sort(
          (a, b) => a.requiredLevel - b.requiredLevel
        ),
      };
    });
}
