export const MAX_SKILL_LEVEL = 99;

export function getXpForLevel(level: number): number {
  if (level <= 1) {
    return 0;
  }

  const clampedLevel = Math.min(
    Math.max(Math.floor(level), 1),
    MAX_SKILL_LEVEL
  );

  return Math.floor(
    50 * Math.pow(clampedLevel - 1, 2.15)
  );
}

export function getSkillLevelFromXp(xp: number): number {
  if (xp <= 0) {
    return 1;
  }

  let low = 1;
  let high = MAX_SKILL_LEVEL;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);

    if (getXpForLevel(middle) <= xp) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return low;
}

export function getSkillProgress(xp: number) {
  const safeXp = Math.max(0, xp);
  const level = getSkillLevelFromXp(safeXp);

  if (level >= MAX_SKILL_LEVEL) {
    return {
      level: MAX_SKILL_LEVEL,
      currentLevelXp: getXpForLevel(MAX_SKILL_LEVEL),
      nextLevelXp: getXpForLevel(MAX_SKILL_LEVEL),
      progress: 100,
      xpToNextLevel: 0,
    };
  }

  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);

  const progress =
    ((safeXp - currentLevelXp) /
      (nextLevelXp - currentLevelXp)) *
    100;

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progress: Math.min(100, Math.max(0, progress)),
    xpToNextLevel: Math.max(0, nextLevelXp - safeXp),
  };
}
