// gear_items.rarity is Engels in de database (common/uncommon/rare/epic/
// legendary) — hier alleen de weergave vertalen, de waarde zelf blijft
// ongewijzigd (wordt ook gebruikt voor sortering/vergelijking elders).
const RARITY_NL: Record<string, string> = {
  common: "Gewoon",
  uncommon: "Ongewoon",
  rare: "Zeldzaam",
  epic: "Episch",
  legendary: "Legendarisch",
};

export function rarityNl(rarity: string): string {
  return RARITY_NL[rarity] || rarity;
}
