export type GearSlot =
  | "jersey"
  | "shorts"
  | "helmet"
  | "shoes"
  | "gloves"
  | "glasses"
  | "socks"
  | "accessory"
  | "cape"
  | "bike_frame"
  | "bike_wheels"
  | "bike_groupset"
  | "bike_saddle"
  | "bike_handlebar";

export const ALL_GEAR_SLOTS: GearSlot[] = [
  "bike_frame",
  "bike_wheels",
  "bike_groupset",
  "bike_saddle",
  "bike_handlebar",
  "jersey",
  "shorts",
  "helmet",
  "shoes",
  "gloves",
  "glasses",
  "socks",
  "accessory",
  "cape",
];

// Speciale waarde voor gear_items.pattern: i.p.v. een vlakke kleur een
// horizontale regenboogbanding (zoals de UCI-wereldkampioenstrui), gebruikt
// voor de romp/mouwen (jersey) of het fietsframe (bike).
export const RAINBOW_PATTERN = "rainbow";

// Speciale sentinel-waardes voor gear_items.required_skill: geven aan dat een
// item niet op skill-/account-level is vergrendeld, maar op een ander soort
// prestige-voorwaarde (net als Runescape's quest cape / achievement diary
// cape / max cape).
export const ALL_QUESTS_COMPLETED_GATE = "__all_quests_completed__";
export const ALL_BADGES_UNLOCKED_GATE = "__all_badges_unlocked__";
// Bij deze gate geeft required_level de vereiste total level (som van alle
// skill-levels) aan, i.p.v. een individueel skill-/account-level.
export const MAX_TOTAL_LEVEL_GATE = "__max_total_level__";

export type GearItem = {
  id: number;
  slot: GearSlot;
  name: string;
  tier: number;
  rarity: string;
  requiredSkill: string | null;
  requiredLevel: number;
  icon: string;
  color: string;
  pattern: string | null;
  description: string | null;
};
