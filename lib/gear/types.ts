export type GearSlot =
  | "jersey"
  | "shorts"
  | "helmet"
  | "shoes"
  | "gloves"
  | "glasses"
  | "socks"
  | "accessory";

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
