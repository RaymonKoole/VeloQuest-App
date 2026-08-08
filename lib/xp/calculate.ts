type ActivityForXp = {
  distance?: number | null;
  total_elevation_gain?: number | null;
};

export function calculateActivityXp(activity: ActivityForXp) {
  const distanceKm = (activity.distance || 0) / 1000;
  const elevationMeters = activity.total_elevation_gain || 0;

  const distanceXp = Math.floor(distanceKm);
  const elevationXp = Math.floor(elevationMeters / 10);

  const bonusXp = 0;

  const totalXp = distanceXp + elevationXp + bonusXp;

  return {
    distanceXp,
    elevationXp,
    bonusXp,
    totalXp,
  };
}
