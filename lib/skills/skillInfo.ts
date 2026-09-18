// Uitleg per skill: wat de skill voorstelt en hoe je hem traint. Net als
// skillNameNl.ts is dit puur weergave-tekst, gekoppeld op de Engelse
// skillnaam uit de database (skills.name) — die blijft de interne sleutel.
type SkillInfo = {
  about: string;
  training: string;
};

const SKILL_INFO: Record<string, SkillInfo> = {
  Cycling: {
    about: "Vertegenwoordigt je algehele fietservaring.",
    training:
      "Train deze skill door simpelweg kilometers te fietsen — elke gereden kilometer telt mee.",
  },
  Climbing: {
    about: "Hoe goed je bent in het beklimmen van hoogtemeters.",
    training: "Train deze skill door hoogtemeters te maken tijdens je ritten.",
  },
  Endurance: {
    about: "Je vermogen om lang actief te blijven op de fiets.",
    training:
      "Train deze skill door lang te fietsen — de totale beweegtijd van al je ritten telt mee.",
  },
  Explorer: {
    about: "Hoe vaak je de fiets pakt.",
    training:
      "Train deze skill door simpelweg ritten te maken — elke rit telt, ongeacht de afstand.",
  },
  Speed: {
    about: "Hoe snel je fietst.",
    training:
      "Train deze skill door kilometers te rijden met een gemiddelde snelheid boven 20 km/u.",
  },
  Racing: {
    about: "Je competitiedrang op Strava-segmenten.",
    training:
      "Train deze skill door segmenten te rijden — extra XP voor elke keer dat je de snelste van jezelf bent (een PR).",
  },
  Adventure: {
    about: "Je voorliefde voor onverhard terrein.",
    training: "Train deze skill door gravelritten te maken.",
  },
  Navigator: {
    about: "Hoeveel verschillende plekken je hebt verkend.",
    training: "Train deze skill door vanuit nieuwe, unieke locaties te fietsen.",
  },
  Social: {
    about: "Hoe sociaal je fietst.",
    training:
      "Train deze skill door onderweg te stoppen bij cafés en andere horecagelegenheden.",
  },
  Discipline: {
    about: "Je consistentie.",
    training:
      "Train deze skill door op opeenvolgende dagen te blijven fietsen — hoe langer je reeks, hoe meer XP.",
  },
  Power: {
    about: "Je fysieke inspanning.",
    training: "Train deze skill door calorieën te verbranden tijdens je ritten.",
  },
  Popularity: {
    about: "Hoe gewaardeerd je ritten zijn.",
    training: "Train deze skill door kudos te verzamelen op Strava.",
  },
  Winter: {
    about: "Hoe actief je bent in de winter.",
    training: "Train deze skill door in de winter te blijven fietsen.",
  },
  Spring: {
    about: "Hoe actief je bent in de lente.",
    training: "Train deze skill door in de lente te blijven fietsen.",
  },
  Summer: {
    about: "Hoe actief je bent in de zomer.",
    training: "Train deze skill door in de zomer te blijven fietsen.",
  },
  Autumn: {
    about: "Hoe actief je bent in de herfst.",
    training: "Train deze skill door in de herfst te blijven fietsen.",
  },
};

export function getSkillInfo(name: string): SkillInfo {
  return (
    SKILL_INFO[name] || {
      about: "Onderdeel van je fietsvoortgang.",
      training: "Blijf fietsen om deze skill te ontwikkelen.",
    }
  );
}
