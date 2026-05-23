import type { Stats } from "./actions";

export const DECAY_RATE_PER_HOUR = 10;

export function calculateDecay(lastDecayAt: number, now: number): number {
  const hoursElapsed = (now - lastDecayAt) / (1000 * 60 * 60);
  return Math.floor(hoursElapsed * DECAY_RATE_PER_HOUR);
}

export function applyDecayToStats(stats: Stats, amount: number): Stats {
  return {
    hunger:      Math.max(0, stats.hunger      - amount),
    energy:      Math.max(0, stats.energy      - amount),
    cleanliness: Math.max(0, stats.cleanliness - amount),
    happiness:   Math.max(0, stats.happiness   - amount),
  };
}
