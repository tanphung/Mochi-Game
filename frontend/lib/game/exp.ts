// Matches EXP_THRESHOLDS in contracts/mochi_pet.py exactly
export const EXP_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1350, 1750,
  2200, 2700, 3300, 4000, 4800, 5700, 6700,
  7800, 9000, 10300, 11700, 13200,
] as const;

export const MAX_LEVEL = 20;

export function levelForExp(exp: number): number {
  let level = 1;
  for (let i = 0; i < EXP_THRESHOLDS.length; i++) {
    if (exp >= EXP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, MAX_LEVEL);
}

export function getExpToNextLevel(level: number, exp: number): number {
  if (level >= MAX_LEVEL) return 0;
  const next = EXP_THRESHOLDS[level] ?? EXP_THRESHOLDS[EXP_THRESHOLDS.length - 1];
  return Math.max(0, next - exp);
}

// Alias used in store for clarity when computing level changes
export function checkLevelUp(exp: number, _currentLevel: number): number {
  return levelForExp(exp);
}

export function getExpProgress(exp: number, level: number): number {
  if (level >= MAX_LEVEL) return 100;
  const current = EXP_THRESHOLDS[level - 1] ?? 0;
  const next    = EXP_THRESHOLDS[level]     ?? current;
  const range   = next - current;
  if (range <= 0) return 100;
  return Math.round(((exp - current) / range) * 100);
}
