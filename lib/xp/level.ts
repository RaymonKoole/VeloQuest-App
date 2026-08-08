const BASE_XP = 100;
const GROWTH_FACTOR = 1.25;

export function getXpRequiredForLevel(level: number) {
  if (level <= 1) {
    return 0;
  }

  return Math.floor(
    BASE_XP * Math.pow(GROWTH_FACTOR, level - 2)
  );
}

export function getLevelFromXp(totalXp: number) {
  let level = 1;

  while (totalXp >= getXpRequiredForLevel(level + 1)) {
    level++;
  }

  const currentLevelXp = getXpRequiredForLevel(level);
  const nextLevelXp = getXpRequiredForLevel(level + 1);

  const xpIntoLevel = totalXp - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;

  return {
    level,
    totalXp,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpNeededForNextLevel,
  };
}
