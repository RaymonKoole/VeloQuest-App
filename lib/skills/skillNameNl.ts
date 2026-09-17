// De skillnamen in de database (skills.name) zijn Engels, omdat ze ook als
// interne sleutel dienen (zie lib/skills/calculateSkills.ts en
// gear_items.required_skill). Om die koppeling niet te breken, vertalen we
// alleen de WEERGAVE van de naam — de database-waarde zelf blijft ongewijzigd.
const SKILL_NAME_NL: Record<string, string> = {
  Cycling: "Fietsen",
  Climbing: "Klimmen",
  Endurance: "Uithoudingsvermogen",
  Explorer: "Ontdekker",
  Speed: "Snelheid",
  Racing: "Racen",
  Adventure: "Avontuur",
  Navigator: "Navigatie",
  Social: "Sociaal",
  Discipline: "Discipline",
  Power: "Kracht",
  Popularity: "Populariteit",
  Winter: "Winter",
  Spring: "Lente",
  Summer: "Zomer",
  Autumn: "Herfst",
};

export function skillNameNl(name: string): string {
  return SKILL_NAME_NL[name] || name;
}
