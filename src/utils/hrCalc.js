// Heart Rate Zone calculations
// HR_REST = 70 bpm (default)
// HR_MAX = 206.9 - (0.67 × age)
// HRR = HR_MAX - HR_REST
// THR = (HRR × % intensity) + HR_REST
// Moderate = 40–59% HRR

export const HR_REST = 70

export function calcHRMax(age) {
  return Math.round(206.9 - 0.67 * age)
}

export function calcHRR(age) {
  return calcHRMax(age) - HR_REST
}

export function calcTHR(age, intensityPct) {
  const hrr = calcHRR(age)
  return Math.round(hrr * (intensityPct / 100) + HR_REST)
}

export function calcModerateZone(age) {
  return {
    low: calcTHR(age, 40),
    high: calcTHR(age, 59)
  }
}

export function getIntensityZone(age, currentHR) {
  const hrr = calcHRR(age)
  const pct = ((currentHR - HR_REST) / hrr) * 100
  if (pct < 40) return { zone: 'light', label: 'Light', color: '#00e676', pct }
  if (pct < 60) return { zone: 'moderate', label: 'Moderate', color: '#ffea00', pct }
  if (pct < 80) return { zone: 'vigorous', label: 'Vigorous', color: '#ff9800', pct }
  return { zone: 'max', label: 'Max', color: '#ff5252', pct }
}

// Simulate HR increase/decrease based on exercise intensity
export function simulateHR(currentHR, isExercising, intensity, deltaTime) {
  const target = isExercising ? HR_REST + intensity * 80 : HR_REST
  const rate = isExercising ? 0.8 : 0.3
  const noise = (Math.random() - 0.5) * 2
  return currentHR + (target - currentHR) * rate * deltaTime + noise
}
