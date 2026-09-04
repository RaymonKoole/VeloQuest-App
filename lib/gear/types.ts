export type GearSlot =
  | "jersey"
  | "shorts"
  | "helmet"
  | "shoes"
  | "gloves"
  | "glasses"
  | "socks"
  | "accessory"
  | "cape";

// Speciale sentinel-waarde voor gear_items.required_skill: geeft aan dat dit
// item niet op skill-/account-level is vergrendeld, maar op het voltooien
// van alle quests (net als de "quest cape" in Runescape).
export const ALL_QUESTS_COMPLETED_GATE = "__all_quests_completed__";

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
  description: string | null;
};
