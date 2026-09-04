/** Langste reeks opeenvolgende kalenderdagen met minstens één rit. */
export function calculateLongestStreak(startDates: (string | null | undefined)[]) {
  const uniqueDates = Array.from(
    new Set(
      startDates
        .filter((date): date is string => Boolean(date))
        .map((date) => date.slice(0, 10))
    )
  ).sort();

  let longestStreak = uniqueDates.length > 0 ? 1 : 0;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]);
    const cur = new Date(uniqueDates[i]);
    const diffDays = Math.round(
      (cur.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (diffDays === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}
